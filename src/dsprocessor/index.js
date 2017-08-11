"use strict";
const
  {PassThrough, Transform} = require(`stream`),
  lib = require(`./lib`);

class DSProcessor extends Transform {
  constructor({
                stimuli, eeg,
                stimuliNumber = 9,
                epochDuration = 1000,
                samplingRate = 250,
                sequence = `filter`,//, detrend
                objectMode = true,
                stringifyOutput = false
              }) {
    super({objectMode});
    
    let epochsFIFO = [];
    let samplesFIFO = [];
    let currentStimulus = [];
    let currentSample = [];
  
    this.stimuliNumber = stimuliNumber;
    this.stringify = stringifyOutput;
    this.steps = sequence.split(/\s*,\s*/);
    
    stimuli.on('data', (stimulus) => {
      // currentStimulus = JSON.parse(stimulus);
      currentStimulus = stimulus;
      
      // let stimulusPeriod = stimuli.signalDuration + stimuli.pauseDuration;
      // if (currentStimulus[0] - currentSample[0] < -stimulusPeriod) eeg.pause();
      // else eeg.resume();
      // if (currentStimulus[0] - currentSample[0] > stimulusPeriod) stimuli.pause();
      // else stimuli.resume();
      
      let epoch = {};
      epoch.key = currentStimulus[1];
      epoch.target = currentStimulus[2];
      epoch.timestamp = currentStimulus[0];
      epoch.stimuliNumber = this.stimuliNumber;
      epoch.stimulusDuration = stimuli.signalDuration;
      epoch.stimulusPause = stimuli.pauseDuration;
      epoch.epochDuration = epochDuration;
      epoch.samplingRate = samplingRate;
      epoch.full = false;
      epoch.state = `raw`;
      epoch.channels = [];
      epochsFIFO.push(epoch);
      
      let obsoleteSampleIndex = null;
      
      for (let i = 0, epochsFIFOlength = epochsFIFO.length; i < epochsFIFOlength; i++) {
        let e = epochsFIFO[i];
        for (let j = 0, samplesFIFOlength = samplesFIFO.length; j < samplesFIFOlength; j++) {
          let s = samplesFIFO[j];
          if (_sampleInsideEpoch(e, s[0])) {
            _addChannels(e, s);
            if (e.channels.length && e.channels[0].length === parseInt(e.epochDuration * e.samplingRate / 1000)) {
              e.full = true;
              // this.epochs.write(JSON.stringify(epochsFIFO.splice(i, 1)[0], null, 2));
              this.write(epochsFIFO.splice(i, 1)[0]);
              i--;
              epochsFIFOlength--;
            }
          } else if (s[0] < e.timestamp /*- stimulusLifeTime*/) {
            obsoleteSampleIndex = j;
          }
        }
      }
      samplesFIFO.splice(0, obsoleteSampleIndex + 1);
      // console.log(`---- epochs: ${epochsFIFO.length}; samples: ${samplesFIFO.length}  ${currentStimulus[0]} ${currentSample[0]} delta(e-s): ${currentStimulus[0] - currentSample[0]}`);
    });
    
    eeg.on('data', (sample) => {
      // currentSample = JSON.parse(sample);
      currentSample = sample;
      
      // let stimulusPeriod = stimuli.signalDuration + stimuli.pauseDuration;
      // if (currentStimulus[0] - currentSample[0] < -stimulusPeriod) eeg.pause();
      // else eeg.resume();
      // if (currentStimulus[0] - currentSample[0] > stimulusPeriod) stimuli.pause();
      // else stimuli.resume();
      
      samplesFIFO.push(currentSample);
      for (let i = 0, epochsFIFOlength = epochsFIFO.length; i < epochsFIFOlength; i++) {
        let e = epochsFIFO[i];
        if (_sampleInsideEpoch(e, currentSample[0])) {
          _addChannels(e, currentSample);
          if (e.channels.length && e.channels[0].length === e.epochDuration * e.samplingRate / 1000) {
            e.full = true;
            // this.epochs.write(JSON.stringify(epochsFIFO.splice(i, 1)[0], null, 2));
            this.write(epochsFIFO.splice(i, 1)[0]);
            i--;
            epochsFIFOlength--;
          }
        }
      }
      // console.log(`ssss epochs: ${epochsFIFO.length}; samples: ${samplesFIFO.length}  ${currentStimulus[0]} ${currentSample[0]} delta(e-s): ${currentStimulus[0] - currentSample[0]}`);
    });
    
    function _sampleInsideEpoch(epoch, sampleTimestamp) {
      return sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.epochDuration;
    }
    
    function _addChannels(epoch, sample) {
      for (let ch = 1; ch < sample.length; ch++) {
        // if (epoch.channels.length < ch) {
        if (epoch.channels[ch - 1] === undefined) {
          epoch.channels[ch - 1] = [];
        }
        epoch.channels[ch - 1].push(sample[ch]);
      }
    }
  }
  
  _transform(epoch, encoding, cb) {
    for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
      for (let step of this.steps) {
        switch (step) {
          case 'filter':
            epoch.channels[i] = lib.butterworth4Bulanov(epoch.channels[i], epoch.samplingRate, 25);
            epoch.state = step;
            break;
          case 'detrend':
            epoch.channels[i] = lib.detrend(epoch.channels[i]);
            epoch.state = step;
            break;
        }
      }
    }
    if (this.stringify)
      cb(null, JSON.stringify(epoch, null, 2)); //For output into process.stdout (and maybe TCP)
    else
      cb(null, epoch);//For output into objectType pipe
  }
}

module.exports = DSProcessor;
