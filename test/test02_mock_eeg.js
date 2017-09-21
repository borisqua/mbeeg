"use strict";
const
  appRoot = require(`app-root-path`),
  fs = require(`fs`),
  eegCSV = require(`csv-streamify`)({objectMode: true}),
  EEG = require(`${appRoot}/src/core/dsprocessor/eeg.js`)
;

let eeg = new EEG({
  // stringify: true,
  // samplingRate: 250,
  objectMode: false
});

fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/eeg45.csv`)
  .pipe(eegCSV)
  .pipe(eeg)
  .pipe(process.stdout)
;

