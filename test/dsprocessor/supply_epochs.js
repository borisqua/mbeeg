"use strict";
const
  {Readable} = require(`stream`),
  Stimuli = require(`./supply_stimuli`),
  EEG = require('./supply_eeg');

class Epochs extends Readable {
  constructor(duration = 1000, samplingRate = 250, options = {objectMode: true}) {
    super(options);
    this.duration = duration;
    this.samplingRate = samplingRate;
    
    let currentStimulus = [];
    let currentSample = [];
    
    let epoch = {};
    this.epochsFIFO = [];
    this.samplesFIFO = [];
    
    this.eeg = new EEG();
    this.stimuli = new Stimuli();
    
    this.stimuli.on('data', (stimulus) => {
      this.epochsFIFO.push(epoch);
      
      currentStimulus = JSON.parse(stimulus);
      
      epoch.key = currentStimulus[1];
      epoch.timestamp = currentStimulus[0];
      epoch.duration = duration;
      epoch.samplingRate = samplingRate;
      epoch.full = false;
      epoch.channels = [];
      
      for (let i = 0; i < this.samplesFIFO.length; i++) {
        let s = this.samplesFIFO[i];
        if (_ok(epoch, s[0])) {
          s = this.samplesFIFO.splice(i, 1);
          for (let ch = 0; ch < s.length; ch++) {
            if (epoch.channels.length < ch + 1) {
              epoch.channels.push([]);
            }
            epoch.channels[ch].push(s[ch]);
          }
        }
      }
      if (epoch.channels[0].length() === epoch.duration * epoch.samplingRate / 1000) {
        epoch.full = true;
      }
      // console.log(epoch);
    });
    
    
    this.eeg.on('data', (sample) => {
      this.samplesFIFO.push(currentSample);
      currentSample = JSON.parse(sample);
      for(e of this.epochsFIFO){
        if(_ok(e,currentSample[0])){
        
        }
      }
    });
    
    function _ok(epoch, sampleTimestamp) {
      return sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.duration;
    }
    
  }


// noinspection JSUnusedGlobalSymbols
  _read() {
    // this.push(JSON.stringify(this.epochsFIFO.shift(),null,2) + `\r\n`);
  }
}

let e = new Epochs();
e.pipe(process.stdout);
