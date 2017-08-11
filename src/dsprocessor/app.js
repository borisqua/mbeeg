"use strict";
const
  Stimuli = require(`../../test/dsprocessor/supply_stimuli`),
  EEG = require('../../test/dsprocessor/supply_eeg'),
  cli = require(`commander`),
  DSProcessor = require(`./`);

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

const stimuli = new Stimuli(100, 100, true);
const eeg = new EEG();

let e = new DSProcessor({stringifyOutput: true,stimuli: stimuli, eeg: eeg, sequence: `filter, detrend`});
e.pipe(process.stdout);

