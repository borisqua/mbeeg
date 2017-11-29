"use strict";

const
  {Stimuli, Stringifier, Tools} = require('mbeeg')
  , plainStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , config = Tools.loadConfiguration(`../../config.json`)
  , stimuli = new Stimuli({ //should pipe simultaneously to the epochs and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliIdArray: config.stimulation.sequence.stimuli
  })
;

  stimuli.pipe(plainStringifier).pipe(process.stdout);

