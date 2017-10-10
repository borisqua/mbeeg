"use strict";

const
  {Stimuli, Stringifier, NTStimuliStringifier, Tools} = require('mbeeg')
  , colors = require('colors')
  , Net = require('net')
  , ntrainerStringifier = new NTStimuliStringifier({
    chunkBegin: ``
    // , chunkEnd: `\r\n`
    , chunksDelimiter: `,`
    // , indentationSpace: 2
    // , stringifyAll: true
    // , endWith: `\r\n`
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
    // chunkEnd: `\r\n`
  })
  , stimulusStringifier = new Stringifier({
    chunkBegin: `{"stimulus":`
    , chunksDelimiter: ``
    // , chunkEnd: `}\r\n`
  })
  , config = Tools.loadConfiguration(`config.json`)
  , cli = require('commander')
  , repl = require('repl')
;

cli.version('0.0.1')
  .description(`Generate sequence of randomly arranged stimuli, and pipes it to stdout`)
  .usage(`<option>`)
  .option(`-v, --vr`, `Run server in virtual reality mode`)
  .option(`-c, --carousel`, `Run server in carousel mode`)
  .parse(process.argv)
;

let
  replSrv = {}
  , mode = ''
  , running = false
  , message = {}
  , stimuliArray = [0, 1, 2]//config.stimulation.sequence.stimuli
  , signalDuration = 100//config.stimulation.duration
  , pauseDuration = 200//config.stimulation.pause
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: signalDuration
    , pauseDuration: pauseDuration
    , stimuliArray: stimuliArray
  })
;

const
  mbeeg = Net.createConnection(config.service.port, config.service.host, () => {
    if (cli.vr || cli.carousel)
      console.log(colors.green(
        `\r\n ... mock neuro-trainer started in '${mode}' mode ...
        \rto change server configuration use file config.json in the same directory as stims.exe and restart server.\r\n
        \rto start stimuli flow enter
        \r> .start
        \rto stop stimuli flow enter
        \r> .stop`));
    else
      console.log(colors.green(
        `\r\n... mock neuro-trainer pending ..."
         \rto change server configuration use file config.json in the same directory as stims.exe then restart server.\r\n
         \rto get help enter > .help command
         \rto start server in 'vr' mode enter > .vr and then >.start
         \rto start server in 'carousel' mode enter > .carousel and then >.start
         \rto stop stimuli flow enter > .stop
         \rto start server from command line interface run
         \r stims.exe -v to start in 'vr' mode
         \r stims.exe -c to start in 'carousel' mode`));
    replSrv = repl.start({prompt: '> '});
    let start = () => {
      if (!mode) console.log(`select mode first. See commands '.vr' and '.carousel'`);
      else {
        
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings";
        message.objects = stimuliArray;
        if (!mbeeg.write(JSON.stringify(message)))
          console.log(`Error: scene settings message sending failed.`);
        else {
          running = true;
          if (mode === 'carousel') {
            message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart";
            message.cells = stimuliArray;
            message.flashDuration = signalDuration;
            message.stepDelay = pauseDuration;
            message.repeat = 0;
            if (mbeeg.write(JSON.stringify(message))) console.log(`started in 'carousel' mode`);
            else console.log(`Error: scene settings message sending failed.`);
          } else {
            console.log(`started in 'vr' mode`);
            stimuli.pipe(ntrainerStringifier).pipe(mbeeg);//process.stdout);
          }
        }
      }
      replSrv.displayPrompt();
    };
    if (cli.vr) {
      mode = 'vr';
      running = true;
      start();
    }
    else if (cli.carousel) {
      mode = 'carousel';
      running = true;
      start();
    }
    replSrv.defineCommand('state', {
      help: `Display current state & mode`, action: () => {
        console.log(`${running ? 'running' : 'pending'} ${!mode ? "with no mode selected" : "in '" + mode + "' mode"}`);
        replSrv.displayPrompt();
      }
    });
    replSrv.defineCommand('start', {
      help: `Start stimulation in selected mode`,
      action: start
    });
    replSrv.defineCommand('stop', {
      help: `Stop stimulation in selected mode`, action: () => {
        if (mode === `vr`) {
          // stimuli.pipe(ntrainerStringifier).pipe(mbeeg);//process.stdout);
          // stimuli.unpipe();
          // stimuli.pause();
          stimuli = {};
        }
        running = false;
        message = {};
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop";
        if (mbeeg.write(JSON.stringify(message))) console.log(`stopped. server pending in ${mode} mode`);
        else console.log(`Error: stop message sending failed.`);
        replSrv.displayPrompt();
      }
    });
    replSrv.defineCommand('vr', {
      help: `Run neuro-trainer server in 'vr' mode`, action: () => {
        mode = 'vr';
        running = false;
        console.log(`Neuro trainer server pending in 'vr' mode`);
        replSrv.displayPrompt();
      }
    });
    replSrv.defineCommand('carousel', {
      help: `Run neuro-trainer server in 'carousel' mode`, action: () => {
        mode = 'carousel';
        running = false;
        console.log(`Neuro trainer server pending in 'carousel' mode`);
        replSrv.displayPrompt();
      }
    });
    
  })
;

