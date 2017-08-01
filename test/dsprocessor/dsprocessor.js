"use strict";
const
  {PassThrough, Transform} = require(`stream`),
  Stimuli = require(`./supply_stimuli`),
  EEG = require('./supply_eeg'),
  DSP = require(`../../src/dsprocessor/dsplib`),
  cli = require(`commander`);


class DSProcessor {
  constructor(epochOptions = {stimulusDuration: 100, stimulusPause: 100, epochDuration: 1000, samplingRate: 250}) {
    
    this.stimuli = new Stimuli(epochOptions.stimulusDuration, epochOptions.stimulusPause, {objectMode: true});
    this.eeg = new EEG({objectMode: true});
    this.epochs = new PassThrough({objectMode: true});
    this.filtered = new Transform({
      objectMode: true,
      transform(epoch, encoding, cb) {
        for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
          epoch.channels[i] = DSP.butterworth4Bulanov(epoch.channels[i], epoch.samplingRate, 25);
        }
        epoch.state = `filtered`;
        cb(null, JSON.stringify(epoch, null, 2)); //For output into process.stdout (and maybe TCP)
        // cb(null, epoch);//For output into objectType pipe
      }
    });
    
    this.detrended = new Transform({
      objectMode: true,
      transform(epoch, encoding, cb) {
        for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
          epoch.channels[i] = DSP.detrend(epoch.channels[i]);
        }
        epoch.state = `detrended`;
        // cb(null, JSON.stringify(epoch, null, 2)); //For output into process.stdout (and maybe TCP)
        cb(null, epoch);//For output into objectType pipe
      }
    });
    
    let epochsFIFO = [];
    let samplesFIFO = [];
    let currentStimulus = [];
    let currentSample = [];
    
    this.filtered.on('data', (epoch) => {
      // this.detrended.write(epoch);
      // console.log(JSON.stringify(epoch,null,2));
    });
    
    this.epochs.on('data', (epoch) => {
      this.filtered.write(epoch);
      // console.log(JSON.stringify(epoch,null,2));
    });
    
    this.stimuli.on('data', (stimulus) => {
      // currentStimulus = JSON.parse(stimulus);
      currentStimulus = stimulus;
      
      // let stimulusPeriod = epochOptions.stimulusDuration + epochOptions.stimulusPause;
      // if (currentStimulus[0] - currentSample[0] < -stimulusPeriod) this.eeg.pause();
      // else this.eeg.resume();
      // if (currentStimulus[0] - currentSample[0] > stimulusPeriod) this.stimuli.pause();
      // else this.stimuli.resume();
      
      let epoch = {};
      epoch.key = currentStimulus[1];
      epoch.timestamp = currentStimulus[0];
      epoch.stimulusDuration = epochOptions.stimulusDuration;
      epoch.stimulusPause = epochOptions.stimulusPause;
      epoch.epochDuration = epochOptions.epochDuration;
      epoch.samplingRate = epochOptions.samplingRate;
      epoch.full = false;
      epoch.state = `raw`;
      epoch.channels = [];
      epochsFIFO.push(epoch);
      
      let obsoleteSampleIndex = null;
      
      for (let i = 0, epochsFIFOlength = epochsFIFO.length; i < epochsFIFOlength; i++) {
        let e = epochsFIFO[i];
        for (let j = 0, samplesFIFOlength = samplesFIFO.length; j < samplesFIFOlength; j++) {
          let s = samplesFIFO[j];
          if (_ok(e, s[0])) {
            _addChannels(e, s);
            if (e.channels.length && e.channels[0].length === parseInt(e.epochDuration * e.samplingRate / 1000)) {
              e.full = true;
              // this.epochs.write(JSON.stringify(epochsFIFO.splice(i, 1)[0], null, 2));
              this.epochs.write(epochsFIFO.splice(i, 1)[0]);
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
    
    this.eeg.on('data', (sample) => {
      // currentSample = JSON.parse(sample);
      currentSample = sample;
      
      // let stimulusPeriod = epochOptions.stimulusDuration + epochOptions.stimulusPause;
      // if (currentStimulus[0] - currentSample[0] < -stimulusPeriod) this.eeg.pause();
      // else this.eeg.resume();
      // if (currentStimulus[0] - currentSample[0] > stimulusPeriod) this.stimuli.pause();
      // else this.stimuli.resume();
      
      samplesFIFO.push(currentSample);
      for (let i = 0, epochsFIFOlength = epochsFIFO.length; i < epochsFIFOlength; i++) {
        let e = epochsFIFO[i];
        if (_ok(e, currentSample[0])) {
          _addChannels(e, currentSample);
          if (e.channels.length && e.channels[0].length === e.epochDuration * e.samplingRate / 1000) {
            e.full = true;
            // this.epochs.write(JSON.stringify(epochsFIFO.splice(i, 1)[0], null, 2));
            this.epochs.write(epochsFIFO.splice(i, 1)[0]);
            i--;
            epochsFIFOlength--;
          }
        }
      }
      // console.log(`ssss epochs: ${epochsFIFO.length}; samples: ${samplesFIFO.length}  ${currentStimulus[0]} ${currentSample[0]} delta(e-s): ${currentStimulus[0] - currentSample[0]}`);
    });
    
    function _ok(epoch, sampleTimestamp) {
      return sampleTimestamp >= epoch.timestamp && sampleTimestamp <= epoch.timestamp + epoch.epochDuration;
    }
    
    function _addChannels(epoch, sample) {
      for (let ch = 1; ch < sample.length; ch++) {
        if (epoch.channels.length < ch) {
          epoch.channels.push([]);
        }
        epoch.channels[ch - 1].push(sample[ch]);
      }
    }
  }
  
}

if (module.parent) {
  module.exports = DSProcessor;
} else {
  cli.version(`0.0.1`)
    .usage(`[command] [options]`)
    .option(`-sp --stimuli-port`, 'TCP port of stimuli server')
    .option(`-eeg --eeg-port`, `TCP port of eeg data emiter`)
    .option(`-s --state <type>`, `Output epochs type`, /^(raw|filtered|detrended)$/i, `detrended`)
    .option(`-f --filter <type>`, `DSP filter type`, /^(lowpass|highpass|bandpass|bandstop|peak|lowshelf|highshelf|aweighting)$/i, `lowpass`)
    .option(`-c --characteristics <type>`,`Filter characteristics type`, /^(butterworth|bessel)$/i, `butterworth`);
  cli
    .command(`server <port>`)
    .description(`run dsprocessor as TCP server`)
    .action((port, options) => {

    });
  cli.command(`stdout`)
    .description(`run dsprocessor with output into process stdout`)
    .action((options) => {
    
    });
  cli.parse(process.argv);
  
  const stimuli = new Stimuli(100, 100, {objectMode: true});
  // const eeg = new EEG({objectMode: true});
  
  let e = new DSProcessor();
  e.filtered.pipe(process.stdout);
}

