"use strict";
const
  appRoot = require(`app-root-path`)
  , fs = require(`fs`)
  , Stimuli = require(`${appRoot}/test/mock_stimuli_transform`)
  , stimuliCSV = require(`csv-streamify`)({objectMode: true})
;

let stimuli = new Stimuli({
  // signalDuration: 120,
  // pauseDuration: 230,
  objectMode: false
});

fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/stimuli45.csv`)
  .pipe(stimuliCSV)
  .pipe(stimuli)
  .pipe(process.stdout)
;

