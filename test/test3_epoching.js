"use strict";
const
  appRoot = require(`app-root-path`),
  fs = require(`fs`),
  stimuliCSV = require(`csv-streamify`)({objectMode: true}),
  eegCSV = require(`csv-streamify`)({objectMode: true}),
  EEG = require(`${appRoot}/src/core/dsprocessor/eeg.js`),
  Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`),
  DSProcessor = require(`${appRoot}/src/core/dsprocessor`)
;

let eeg = new EEG({
  // samplingRate: 250,
  objectMode: true
});

let stimuli = new Stimuli.Transform({
  // signalDuration: 120,
  // pauseDuration: 230,
  objectMode: true
});

// noinspection JSUnusedLocalSymbols
const epochs = new DSProcessor({
    stimuli:
      fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/stimuli45.csv`)
        .pipe(stimuliCSV)
        .pipe(stimuli),
    eeg:
      fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/eeg45.csv`)
        .pipe(eegCSV)
        .pipe(eeg)
    , learning: false
    , stimuliNumber: 4
    , epochDuration: 1000
    , samplingRate: 250
    , sequence: `filter, detrend`
    // , objectMode: true
    , objectMode: false
    
  })
    .pipe(process.stdout)
;

