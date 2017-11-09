"use strict";
const
  appRoot = require('app-root-path'),
  fs = require('fs'),
  stimuliCSV = require('csv-streamify')({objectMode: true}),
  eegCSV = require('csv-streamify')({objectMode: true}),
  EEG = require(`${appRoot}/src/core/dsprocessor/eeg.js`),
  Stimuli = require(`${appRoot}/test/mock_stimuli_transform.js`),
  DSVProcessor = require(`${appRoot}/src/core/dsprocessor`),
  EpochsProcessor = require(`${appRoot}/src/core/epprocessor`)
;

let eeg = new EEG({
  // samplingRate: 250,
  objectMode: true
});

let stimuli = new Stimuli({
  // signalDuration: 120,
  // pauseDuration: 230,
  objectMode: true
});

const epochs = new DSVProcessor({
    stimuli:
      fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/stimuli45.csv`)
        .pipe(stimuliCSV)
        .pipe(stimuli),
    samples:
      fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/eeg45.csv`)
        .pipe(eegCSV)
        .pipe(eeg)
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
    , objectMode: true
    
  })
;

// noinspection JSUnusedLocalSymbols
const epochProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: false
    , depth: 5
    , stimuliNumber: 4
    , objectMode: false
  })
  .pipe(process.stdout)
;

