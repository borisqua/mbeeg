"use strict";
const
  // merge2 = require('merge2'),
  appRoot = require('app-root-path'),
  fs = require('fs'),
  stimuliCSV = require('csv-streamify')({objectMode: true}),
  eegCSV = require('csv-streamify')({objectMode: true}),
  EEG = require(`${appRoot}/src/core/dsprocessor/eeg.js`),
  Stimuli = require(`${appRoot}/test/mock_stimuli_transform.js`),
  Classifier = require(`${appRoot}/src/core/classifier`),
  DSProcessor = require(`${appRoot}/src/core/dsprocessor`),
  EpochsProcessor = require(`${appRoot}/src/core/epprocessor`);

let eeg = new EEG({
  // samplingRate: 250,
  objectMode: true
});

let stimuli = new Stimuli({
  // signalDuration: 120,
  // pauseDuration: 230,
  objectMode: true
});

const epochs = new DSProcessor({
  stimuli:
    fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/stimuli45.csv`)
      .pipe(stimuliCSV)
      .pipe(stimuli),
  samples:
    fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/eeg45.csv`)
      .pipe(eegCSV)
      .pipe(eeg)
  , learning: false
  , stimuliNumber: 4
  , epochDuration: 1000
  , samplingRate: 250
  , sequence: `filter, detrend`
  , objectMode: true
  
});

const classifier = new Classifier({
  // method: lib.absIntegral,
  objectMode: false
  // objectMode: true
});

const epochProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: false
    , depth: 5
    , stimuliNumber: 4
    , objectMode: true
  })
    .pipe(classifier)
    // .on(`data`, classification => console.log(classification.reduce((ac, v, i, ar) => ar[ac] < v ? ac = i : ac, 0)))
    .pipe(process.stdout)
;

