"use strict";
const
  appRoot = require(`app-root-path`),
  Stimuli = require(`${appRoot}/test/dsprocessor/supply_stimuli`),
  EEG = require(`${appRoot}/test/dsprocessor/supply_eeg`),
  cli = require(`commander`),
  DSProcessor = require(`${appRoot}/src/core/dsprocessor/index`),
  Classifier = require(`${appRoot}/src/core/epprocessor/index`);
  

cli.version(`0.0.1`)
  .usage(`[command] [options]`)
  .option(`-sp --stimuli-port`, 'TCP port of stimuli server')
  .option(`-eeg --eeg-port`, `TCP port of eeg data emiter`)
  .option(`-s --state <type>`, `Output epochs type`, /^(raw|filtered|detrended)$/i, `detrended`)
  .option(`-f --filter <type>`, `DSP filter type`, /^(lowpass|highpass|bandpass|bandstop|peak|lowshelf|highshelf|aweighting)$/i, `lowpass`)
  .option(`-c --characteristics <type>`, `Filter characteristics type`, /^(butterworth|bessel)$/i, `butterworth`);
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

const stimuli = new Stimuli(150, 150, true);
const eeg = new EEG();

let e = new DSProcessor({stimuli, eeg, sequence: `filter`, stimuliNumber: 33});
let c = new Classifier({stringifyOutput: true});
e.pipe(c).pipe(process.stdout);
//e.processed.pipe(process.stdout);
