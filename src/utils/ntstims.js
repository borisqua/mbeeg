"use strict";

const
  {Stimuli, Stringifier, NTStimuliStringifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  // , config = Tools.loadConfiguration(`../../config.json`)
  , stimuli = new Stimuli({
    duration: config.mbeeg.stimulation.duration
    , pause: config.mbeeg.stimulation.pause
    , stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli
  })
  , colors = require('colors')
  , Net = require('net')
  , plainStringifier = new Stringifier({
    // chunkBegin: `{`
    chunksDelimiter: `\r\n`
    // , chunkEnd: `}`
  })
  , ntStringifier = new NTStimuliStringifier({//todo clarify NT stringifiers - make stringify library
    chunkBegin: ``
    , chunkEnd: `\r\n`
    , chunksDelimiter: `,`
    , indentationSpace: 0
    // , stringifyAll: true
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
  , repl = require('repl')
;

let
  replSrv = {}
  , message = {}
  , running = false
;

const
  mbeeg = Net.createConnection(config.tcpserver.port, config.tcpserver.host, () => {
    console.log(colors.green(
      `\r\n ... mock neuro-trainer started ...
        \rto change server configuration use file config.json in the same directory as stims.exe and restart server.\r\n
        \rto get help enter > .help command
        \rto start new stimuli flow enter
        \r> .start [some array of unique stimuli identities]
        \ri.e.
        \r > .start [2,1,3,7]
        \rto stop stimuli flow enter
        \r > .stop
        \r
        \r`));
    
    replSrv = repl.start({prompt: '> '});
    
    let
      start = (stimuliIdArray, duration = config.mbeeg.stimulation.duration, pause = config.mbeeg.stimulation.pause) => {
        console.log(`duration = ${duration}, pause=${pause}`);
        stimuli.bound();
        stimuliIdArray = JSON.parse(stimuliIdArray);
        console.log(stimuliIdArray);
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings";
        message.objects = stimuliIdArray;
        stimuli.reset({
          stimuliIdArray: stimuliIdArray,
          duration: duration,
          pause: pause
        });
        if (!mbeeg.write(`${JSON.stringify(message)}\r\n`))
          console.log(`Error: scene settings message sending failed.`);
        else {
          console.log(`started with ${stimuliIdArray} sequence...`);
          if (!running) {
            stimuli
              .on('error', error => {throw ` error in stimuli stream - ${error}`;})//todo .on('error',..) to every pipe chain
              .pipe(ntStringifier)
              .on('error', error => {throw ` error in ntStringifier - ${error}`;})
              // .pipe(process.stdout)
              .pipe(mbeeg)
              .on('error', error => {throw ` error in mbeegntsrv - ${error}`;})
            ;
            running = true;
          }
        }
        replSrv.displayPrompt();
      },
      
      stop = () => {
        stimuli.unbound();
        message = {};
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop";
        if (mbeeg.write(`${JSON.stringify(message)}\r\n`)) console.log(`stopped. server in pending mode...`);
        else console.log(`Error: stop message sending failed.`);
        replSrv.displayPrompt();
      }
    ;
    
    replSrv.defineCommand('start', {
      help: `Start stimulation with given array of stimuli identities`,
      action: start
    });
    replSrv.defineCommand('stop', {
      help: `Stop stimulation`,
      action: stop
    });
  })
;

mbeeg
  .on('error', error => {throw error;})
  // .on('data', chunk => { console.log(chunk.toString()); })
;
