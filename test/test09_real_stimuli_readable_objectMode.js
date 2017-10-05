"use strict";
const
  appRoot = require('app-root-path')
  , {Transform} = require('stream')
  , Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`)
  , config = require(`${appRoot}/config`) //1. Load configuration - config.json file with stimuli, dsp and carousel parameters
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    // objectMode: false,
    signalDuration: config.stimulation.duration,
    pauseDuration: config.stimulation.pause,
    stimuliArray: config.stimulation.sequence.stimuli
  })
;

const stringifier = new Transform({
  objectMode: true,
  transform(chunk, encoding, cb) {
    cb(null, `${JSON.stringify(chunk)}\r\n`);
  }
});

stimuli
// .pipe(stringifier)
  .pipe(new Transform({
    objectMode: true,
    transform(chunk, encoding, cb) {
      cb(null, `${JSON.stringify(chunk)}\r\n`);
    }
  }))
  .pipe(process.stdout)
;
