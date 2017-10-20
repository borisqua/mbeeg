"use strict";

const
  {Stimuli, Stringifier, NTStimuliStringifier, Tools} = require('mbeeg')
  , ntrainerStringifier = new NTStimuliStringifier({
    chunkBegin: ``
    , chunkEnd: ``
    , chunksDelimiter: `,`
    , indentationSpace: 2
    , stringifyAll: true
    , fields: [
      {name: "timestamp", type: "value"}
      , {name: "cellId", type: "value"}
      , {name: "target", type: "value"}
      , {
        name: "class",
        type: "literal",
        content: "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellFlashing"
      }
    ]
  })
  , plainStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , stimulusStringifier = new Stringifier({
    chunkBegin: `{"stimulus":`
    , chunksDelimiter: ``
    , chunkEnd: `}\r\n`
  })
  , config = Tools.loadConfiguration(`config.json`)
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliIdArray: config.stimulation.sequence.stimuli
  })
  , cli = require('commander')
;

cli.version('0.0.1')
  .description(`Generate sequence of randomly arranged stimuli, and pipes it to stdout`)
  .usage(`<option>`)
  .option(`-p, --plain`, `Outputs plain vectors strings`)
  .option(`-j, --json`, `Outputs json wrapped vectors`)
  .option(`-n, --neurotrainer`, `Outputs wrapped with Neuro Trainer specific json`)
  .parse(process.argv)
;
if (process.argv.length <= 2) cli.help();
if (cli.plain) stimuli.pipe(plainStringifier).pipe(process.stdout);
if (cli.json) stimuli.pipe(stimulusStringifier).pipe(process.stdout);
if (cli.neurotrainer) stimuli.pipe(ntrainerStringifier).pipe(process.stdout);


