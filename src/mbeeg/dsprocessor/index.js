"use strict";
//TODO 3.Detecting samples or epochs leaks
//TODO 4.Refactor to use writable capabilities of the DSProcessor stream, by writing merged stream of stimuli and eeg data. For this purpose DSProcess should have capability to distinguish chunks of this two streams.
const
  Tools = require('../tools').Tools
;

class DSProcessor extends require('stream').Transform {
  constructor({
                stimuli
                , samples
                , channels
                // , learning = false
                , epochDuration
                , processingSequence
                , cyclesLimit
                , objectMode = true
              }) {
    super({objectMode: true});
    
    this.stimuli = stimuli;
    this.samples = samples;
    this.channels = channels;
    // this.learning = learning;
    this.epochDuration = epochDuration;
    this.processingSequence = processingSequence;
    this.cyclesLimit = cyclesLimit;
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
      epoch.cycle = this.stimuli.stimulusCycle;
      epoch.stimulusDuration = this.stimuli.signalDuration;
      epoch.stimulusPause = this.stimuli.pauseDuration;
      epoch.duration = this.epochDuration;
      epoch.samplingRate = this.samples.header.samplingRate;
      epoch.state = `raw`;
      epoch.full = false;
      epoch.timestamp = stimulus[0];
      epoch.target = stimulus[2];
      epoch.channels = new Array(this.channels.length).fill([]);//TODO think about refactor epoch.channels into epoch.samples
      
      this.epochsFIFO.push(epoch);
      
      for (let i = 0; i < this.epochsFIFO.length; i++) {
        let
          e = this.epochsFIFO[i]
          , samplesDeficit = false
        ;
        for (let j = 0; j < this.samplesFIFO.length; j++) {
          let samp = this.samplesFIFO[j];
          if (this.samplesFIFO.length - j >= this.samplesEpochLength) {
            if (_firstSampleOfEpoch(this, e, samp[0])) {
              if (_completeEpoch(this, e, j)) {
                e.full = true;
                if (this.cyclesLimit && this.cyclesLimit < e.cycle) { //stop if output is limited
                  this.unpipe();
                  process.exit(0);
                }
                this.write(this.epochsFIFO.splice(i, 1)[0]);
                i--;
                this.epochsFIFOlength--;
              }
              
            }
          } else {
            samplesDeficit = true;
            break;
          }
        }
        if (samplesDeficit) break;
      }
      // console.log(`ssss epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}`);//  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
      // console.log(`---- epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
    });
    
    samples.on('data', samplesChunk => {
      // preventDefault();
      if (!this.timestamp) {
        this.samplingRate = this.samples.header.samplingRate;
        this.timestamp = this.samples.header.timestamp;
        this.samplingStep = 1000 / this.samplingRate;
        this.samplesEpochLength = this.epochDuration / this.samplingStep;
      }
      
      for (let s = 0; s < samplesChunk.length; s++) {//adding timestamp field
        samplesChunk[s].unshift(Math.round(this.timestamp += this.samplingStep));
      }//TODO think about correction of timestamp by information from each next ovStreamJSON
      this.samplesFIFO = this.samplesFIFO.concat(samplesChunk);
      
      if (!this.epochsFIFO.length && this.samplesFIFO.length >= this.samplesEpochLength) {//keep samplesFIFO length not greater than epoch duration
        this.samplesFIFO.splice(0, this.samplesFIFO.length - this.samplesEpochLength);
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
        for (let s = startSample; s < startSample + context.samplesEpochLength; s++) {
          for (let ch = 0; ch < epoch.channels.length; ch++) {
            if (context.channels.includes(ch + 1))
              epoch.channels[ch].push(context.samplesFIFO[s][ch + 1]);
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
    for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
      for (let step of this.processingSequence) {
        switch (step.name) {//TODO sometimes epoch.channels[i] is empty don't know why
          case 'butterworth4BulanovLowpass':
            epoch.channels[i] = Tools.butterworth4Bulanov(epoch.channels[i], epoch.samplingRate, step.parameters[0].value);
            break;
          case 'detrend':
            epoch.channels[i] = Tools.detrend(epoch.channels[i]);
            break;
          case 'rereference':
            epoch.channels[i] = Tools.rereference(epoch.channels[i]);
            break;
        }
        epoch.state = step.name;
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
