"use strict";
//TODO 1.Problem with overlapping epochs & deleting samples (it is necessary to make sure that the sample falls into every epoch where it should be, and only after that it will be removed)
//TODO 2.Consider throwing away of unused leading stimuli and epochs
//TODO 3.Detecting samples or epochs leaks
//TODO refactor to use writable capabilities of the DSProcessor stream, by writing merged stream of stimuli and eeg data. For this purpose DSProcess should have capability to distinguish chunks of this two streams.
const
  // appRoot = require('app-root-path'),
  {Tools} = require('mbeeg')
;

class DSProcessor extends require('stream').Transform {
  constructor({
                stimuli
                , samples
                , channels = [1] //channels selector. first channel by default, index 0 reserved for timestamp in samples input stream
                // , learning = false
                , epochDuration = 1000
                , samplingRate = 128 //TODO sampling rate should be taken from samples input object
                , processingSequence = `filter, detrend`//rereference`//, detrend` ////filter, detrend rereference``
                , cyclesLimit = 0
                , objectMode = true
              }) {
    super({objectMode: true});
    
    let epochsFIFO = [];
    let samplesFIFO = [];
    let currentStimulus = [];
    let currentSample = [];
    
    this.channels = channels;
    this.samplingRate = samplingRate;
    this.learning = null;
    this.objectMode = objectMode;
    this.processingSteps = processingSequence.split(/\s*,\s*/);
    this.cyclesLimit = cyclesLimit;
    
    stimuli.on('data', stimulus => {
      currentStimulus = stimulus;
      
      let stimulusPeriod = stimuli.signalDuration + stimuli.pauseDuration;
      if (currentStimulus[0] - currentSample[0] < -stimulusPeriod) samples.pause();
      else samples.resume();
      if (currentStimulus[0] - currentSample[0] > stimulusPeriod) stimuli.pause();
      else stimuli.resume();
      
      let epoch = {};
      epoch.key = currentStimulus[1];
      epoch.cycle = stimuli.stimulusCycle;
      epoch.stimulusDuration = stimuli.signalDuration;
      epoch.stimulusPause = stimuli.pauseDuration;
      epoch.epochDuration = epochDuration;
      epoch.samplingRate = this.samplingRate;
      epoch.state = `raw`;//[cycle_idx]
      epoch.full = false;//[cycle_idx]
      epoch.timestamp = currentStimulus[0];//[cycle_idx]
      epoch.target = currentStimulus[2];//[cycle_idx]
      epoch.channels = [];//[ch_idx][sample_idx][cycle_idx]
      epochsFIFO.push(epoch);
      
      let obsoleteSampleIndex = null;
      
      for (let i = 0, epochsFIFOlength = epochsFIFO.length; i < epochsFIFOlength; i++) {
        let e = epochsFIFO[i];
        for (let j = 0, samplesFIFOlength = samplesFIFO.length; j < samplesFIFOlength; j++) {
          let s = samplesFIFO[j];
          if (_sampleInsideEpoch(e, s[0])) {
            if (_completeEpoch(this, e, currentSample)) {
              e.full = true;
              if (this.cyclesLimit && this.cyclesLimit < e.cycle) this.unpipe(); //stop if output is limited
              this.write(epochsFIFO.splice(i, 1)[0]);
              i--;
              epochsFIFOlength--;
            }
          } else if (s[0] < e.timestamp) {
            obsoleteSampleIndex = j;
          }
        }
      }
      samplesFIFO.splice(0, obsoleteSampleIndex + 1);
      // console.log(`---- epochs: ${epochsFIFO.length}; samples: ${samplesFIFO.length}  ${currentStimulus[0]} ${currentSample[0]} delta(e-s): ${currentStimulus[0] - currentSample[0]}`);
    });
    
    samples.on('data', sample => {
      currentSample = sample;
      
      let stimulusPeriod = stimuli.signalDuration + stimuli.pauseDuration;
      if (currentStimulus[0] - currentSample[0] < -stimulusPeriod) samples.pause();
      else samples.resume();
      if (currentStimulus[0] - currentSample[0] > stimulusPeriod) stimuli.pause();
      else stimuli.resume();
      
      // if (epochsFIFO.length === 0 || epochsFIFO[0].timestamp <= currentSample[0])
      samplesFIFO.push(currentSample);//it's only has sense to store sample if there isn't epochs in the epochsFIFO queue (so we don't know if epochs for current sample will be) or if the sample came after the earliest epoch available in epochsFIFO queue
      for (let i = 0, epochsFIFOlength = epochsFIFO.length; i < epochsFIFOlength; i++) {
        let e = epochsFIFO[i];
        if (_sampleInsideEpoch(e, currentSample[0])) {
          if (_completeEpoch(this, e, currentSample)) {
            e.full = true;
            this.write(epochsFIFO.splice(i, 1)[0]);
            i--;
            epochsFIFOlength--;
          }
        }
      }
      // console.log(`ssss epochs: ${epochsFIFO.length}; samples: ${samplesFIFO.length}  ${currentStimulus[0]} ${currentSample[0]} delta(e-s): ${currentStimulus[0] - currentSample[0]}`);
    });
    
    function _sampleInsideEpoch(epoch, sampleTimestamp) {
      // console.log(sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.epochDuration);
      return sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.epochDuration;
    }
    
    function _completeEpoch(context, epoch, sample) {
      for (let ch = 1; ch < sample.length; ch++) {
        // if (context.channels.includes(ch))
        let channelIndex = context.channels.indexOf(ch);
        if (channelIndex >= 0)
          if (epoch.channels[channelIndex] === undefined) {
            epoch.channels[channelIndex] = [sample[ch]];
            // console.log(`channel length ${epoch.channels[channelIndex].length}`);
          } else {
            epoch.channels[channelIndex].push(sample[ch]);
            // console.log(`channel length ${epoch.channels[channelIndex].length}`);
          }
      }
      // epoch.channels.every(ch => console.log(`channel length ${ch.length}`));
      return !!(epoch.channels.length && epoch.channels.every(ch => ch.length === epoch.epochDuration * epoch.samplingRate / 1000));
      
    }
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
      for (let step of this.processingSteps) {
        switch (step) {
          case 'filter':
            epoch.channels[i] = Tools.butterworth4Bulanov(epoch.channels[i], epoch.samplingRate, 25);
            break;
          case 'detrend':
            epoch.channels[i] = Tools.detrend(epoch.channels[i]);
            break;
          case 'rereference':
            epoch.channels[i] = Tools.rereference(epoch.channels[i]);
            break;
        }
        epoch.state = step;
      }
    }
    // if (epoch.cycle > 0)
    if (this.objectMode)
      cb(null, epoch);//For output into objectType pipe
    else
      cb(null, JSON.stringify(epoch, null, 2)); //For output into process.stdout (and maybe TCP)
  }
}

module.exports = DSProcessor;
