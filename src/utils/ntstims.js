"use strict";

const
  {Stimuli, Stringifier, NTStimuliStringifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , stimuli = new Stimuli({
    cycles: config.stimulation.sequence.stimuli,
    signalDuration: config.stimulation.duration,
    pauseDuration: config.stimulation.pause
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
    , chunkEnd: `\r\n` //todo clean up all that \r\n issues in stringifiers and jsons
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
  mbeeg = Net.createConnection(config.service.port, config.service.host, () => {
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
      start = (cycles, signalDuration, pauseDuration) => {
        stimuli.resume();
        cycles = JSON.parse(cycles);
        console.log(cycles);
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings";
        message.objects = cycles;
        stimuli.reset({
          stimuliIdArray: cycles,
          signalDuration: signalDuration,
          pauseDuration: pauseDuration
        });
        if (!mbeeg.write(`${JSON.stringify(message)}\r\n`))
          console.log(`Error: scene settings message sending failed.`);
        else {
          console.log(`started with ${cycles} sequence...`);
          if (!running) {
            stimuli.pipe(ntStringifier).pipe(mbeeg);//process.stdout);
            running = true;
          }
        }
        replSrv.displayPrompt();
      },
      
      stop = () => {
        stimuli.pause();
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
  });

// mbeeg.on('data', chunk => {
//   console.log(chunk.toString());
// });
