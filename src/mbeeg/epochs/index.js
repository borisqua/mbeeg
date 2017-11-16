"use strict";
const log = require('debug')('mbeeg:Epochs');

class Epochs extends require('stream').Transform {
  constructor({
                stimuli
                , samples
                , cycleLength
                , channels //channels description - array with channel numbers started from 1
                // , learning = false
                , epochDuration
                , processingSequence
              }) {
    super({objectMode: true});
    this.cycleLength = cycleLength;
    this.channels = channels;
    // this.learning = learning;
    this.epochDuration = epochDuration;
    this.processingSequence = processingSequence;
    this.stimuliCounter = 0;
    
    this.epochsFIFO = [];
    this.samplesFIFO = [];
    
    stimuli.on('data', stimulus => {
      // preventDefault();
      if (!this.timestamp || this.samplesFIFO[0] > stimulus[0]) {
        return;
      }
      
      let epoch = {};
      epoch.key = stimulus[1];
      epoch.number = this.stimuliCounter++;
      epoch.cycle = Math.floor(epoch.number / this.cycleLength);
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
                this.write(e);
                this.epochsFIFO.shift();
                break; //this is crucial 'break' because two adjacent samples can both catisfy same _firstSampleOfEpoch condition (>=epoch.timestamp && <=epoch.timestamp+epoch.samplingStep)
              }
              
            }
          } else {
            samplesDeficit = true;
            break;
          }
        }
        if (samplesDeficit) break;
      }
      // log(`---- epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}`);//  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
      // log(`---- epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
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
      }//TODO think about correction of timestamp by information from each next ovStreamJSON, and more general - think about stream driven class (all properties of class come with stream)
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
      // log(`ssss epochs: ${this.epochsFIFO.length}; samples: ${this.samplesFIFO.length}`);//  ${this.epochsFIFO[0].timestamp} ${this.timestamp} delta(e-s): ${this.epochsFIFO[0].timestamp - this.timestamp}`);
    });
    
    function _firstSampleOfEpoch(context, epoch, sampleTimestamp) {
      // log(sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.duration);
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
    log(`        ::NextEpochReady-- Epoch key/#/cycle - ${epoch.key}/${epoch.number}/${epoch.cycle}`);
    cb(null, epoch);
  }
  
  reset(newValue) {
    this.cycleLength = newValue;
    this.stimuliCounter = 0;
  }
}

module.exports = Epochs;
