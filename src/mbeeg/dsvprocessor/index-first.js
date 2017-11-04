"use strict";
//TODO 3.Detecting samples or epochs leaks
//TODO 4.Refactor to use writable capabilities of the Epochs stream, by writing merged stream of stimuli and eeg data. For this purpose DSProcess should have capability to distinguish chunks of this two streams.
const
  Tools = require('../tools').Tools
;

class DSProcessor extends require('stream').Transform {
  constructor({
                stimuli
                , samples
                , channels //channels description in form of array with channel numbers started from 1
                // , learning = false
                , epochDuration
                , processingSequence
                // , cyclesLimit
                , objectMode = true
              }) {
    super({objectMode: true});
    
    this.channels = channels;
    // this.learning = learning;
    this.epochDuration = epochDuration;
    this.processingSequence = processingSequence;
    this._stimuliCounter = 0;
    // this.cyclesLimit = cyclesLimit;
    this.objectMode = objectMode;
    
    this.epochsFIFO = [];
    this.samplesFIFO = [];
    
    stimuli.on('data', stimulus => {
      // preventDefault();
      if (!this.timestamp || this.samplesFIFO[0] > stimulus[0]) {
        return;
      }
      
      let epoch = {};
      epoch.key = stimulus[1];
      epoch.number = this._stimuliCounter++;
      // epoch.stimulusDuration = stimuli.signalDuration;
      // epoch.stimulusPause = stimuli.pauseDuration;
      epoch.duration = this.epochDuration;
      epoch.samplingRate = samples.header.samplingRate;
      epoch.state = `raw`;
      epoch.full = false;
      epoch.timestamp = stimulus[0];
      epoch.target = stimulus[2];
      epoch.channels = new Array(this.channels.length).fill([]);
      
      this.epochsFIFO.push(epoch);
      
      while (this.epochsFIFO.length) {
        let
          e = this.epochsFIFO[0]
          , samplesDeficit = false
        ;
        
        for (let j = 0; j < this.samplesFIFO.length; j++) {
          let samp = this.samplesFIFO[j];
          if (this.samplesFIFO.length - j >= this.epochLengthInSamples) {
            if (_firstSampleOfEpoch(this, e, samp[0])) {
              if (_completeEpoch(this, e, j)) {
                e.full = true;
                // if (this.cyclesLimit && this.cyclesLimit < e.cycle) { //stop if output is limited
                //   this.unpipe();
                //   process.exit(0);
                // }
                this.write(e);
                this.epochsFIFO.shift();
                break; //this is crucial 'break' because two adjacent samples can catisfy same _firstSampleOfEpoch condition (>=epoch.timestamp && <=epoch.timestamp+epoch.samplingStep)
              }
              
            }
          } else {
            samplesDeficit = true;
            break;
          }
        }
        if (samplesDeficit) break;
      }
      // console.log(`---- epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}`);//  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
      // console.log(`---- epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
    });
    
    samples.on('data', chunk => {
      // preventDefault();
      let samplesChunk = chunk.slice();
      if (!this.timestamp) {
        this.samplingRate = samples.header.samplingRate;
        this.timestamp = samples.header.timestamp;
        this.samplingStep = 1000 / this.samplingRate;
        this.epochLengthInSamples = this.epochDuration / this.samplingStep;
      }
      
      for (let s = 0; s < samplesChunk.length; s++) {//adding timestamp field
        samplesChunk[s].unshift(Math.round(this.timestamp += this.samplingStep));
      }//TODO think about correction of timestamp by information from each next ovStreamJSON
      this.samplesFIFO = this.samplesFIFO.concat(samplesChunk);
      
      if (!this.epochsFIFO.length && this.samplesFIFO.length >= this.epochLengthInSamples) {//keep samplesFIFO length not greater than epoch duration
        this.samplesFIFO.splice(0, this.samplesFIFO.length - this.epochLengthInSamples);
        return;
      }
      if (this.epochsFIFO.length) {
        let s;
        for (s = 0; s < this.samplesFIFO.length; s++)//counting samples that emerged earlier than first stimulus
          if (this.samplesFIFO[s][0] >= this.epochsFIFO[0].timestamp)
            break;
        this.samplesFIFO.splice(0, s);
      }
      // console.log(`ssss epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}`);//  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
    });
    
    function _firstSampleOfEpoch(context, epoch, sampleTimestamp) {
      // console.log(sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.duration);
      return (sampleTimestamp >= epoch.timestamp) && (sampleTimestamp <= epoch.timestamp + context.samplingStep);
    }
    
    function _completeEpoch(context, epoch, startSample) {
      try {
        for (let s = startSample; s < startSample + context.epochLengthInSamples; s++) {
          for (let ch = 0; ch < epoch.channels.length; ch++) {
            epoch.channels[ch].push(context.samplesFIFO[s][context.channels[ch]]);
          }
        }
        return true;
      } catch (err) {
        throw err;
      }
      
    }
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    console.log(`--DEBUG::    DSProcessor::NextEpochReady--Key=${epoch.key} Epoch number=${epoch.number}`);
    for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
      for (let step of this.processingSequence) {//TODO make each DSP stage as distinct Transformer stream
        switch (step.name) {
          case 'butterworth4BulanovLowpass':
            epoch.channels[i] = Tools.butterworth4Bulanov(epoch.channels[i], epoch.samplingRate, step.parameters.cutoff);
            break;
          case 'detrend':
            epoch.channels[i] = Tools.detrend(epoch.channels[i], true);
            break;
          case 'rereference':
            epoch.channels[i] = Tools.rereference(epoch.channels[i]);
            break;
        }
        epoch.state = step.name;
      }
    }
    if (this.objectMode)
      cb(null, epoch);//For output into objectType pipe
    else
      cb(null, JSON.stringify(epoch, null, 2)); //For output into process.stdout (and maybe TCP)
  }
}

module.exports = DSProcessor;
