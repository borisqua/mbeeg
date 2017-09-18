"use strict";
const
  appRoot = require(`app-root-path`),
  fs = require(`fs`),
  stimuliCSV = require(`csv-streamify`)({objectMode: true}),
  Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`)
;

let stimuli = new Stimuli.Transform({
  signalDuration: 120,
  pauseDuration: 230,
  objectMode: false
});

fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/stimuli45.csv`)
  .pipe(stimuliCSV)
  .pipe(stimuli)
  .pipe(process.stdout)
;

