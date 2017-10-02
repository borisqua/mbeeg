"use strict";

const
  {Stimuli, Stringifier, NTStimuliStringifier, Tools} = require('mbeeg')
  , colors = require('colors')
  , Net = require('net')
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
    chunkEnd: `\n\r`
  })
  , stimulusStringifier = new Stringifier({
    chunkBegin: `{"stimulus":`
    , chunksDelimiter: ``
    , chunkEnd: `}\n\r`
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
;

const
  stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: signalDuration
    , pauseDuration: pauseDuration
    , stimuliArray: stimuliArray
  })
  , mbeeg = Net.createConnection(config.service.port, config.service.host, () => {
    if (cli.vr || cli.carousel)
      console.log(colors.green(
        `\n\r ... mock neuro-trainer started in '${mode}' mode ...
        \rto change server configuration use file config.json in the same directory as stims.exe and restart server.\n\r
        \rto start stimuli flow enter
        \r> .start
        \rto stop stimuli flow enter
        \r> .stop`));
    else
      console.log(colors.green(
        `\n\r... mock neuro-trainer pending ..."
         \rto change server configuration use file config.json in the same directory as stims.exe then restart server.\n\r
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
        running = true;
        
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings";
        message.object = stimuliArray;
        if (!mbeeg.write(JSON.stringify(message)))
          console.log(`Error: scene settings message sending failed.`);
        if (mode === 'carousel') {
          message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart";
          message.flashDuration = signalDuration;
          message.stepDelay = pauseDuration;
          if (mbeeg.write(JSON.stringify(message))) console.log(`started in 'carousel' mode`);
          else console.log(`Error: scene settings message sending failed.`);
        } else {
          console.log(`started in 'vr' mode`);
          stimuli.pipe(ntrainerStringifier).pipe(mbeeg);//process.stdout);
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
        
        running = false;
        message = {};
        message.class = "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeggFlashStop";
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
// mbeeg.pipe(process.stdout);

/*

console.log(`client ${socket.remoteAddress}:${socket.remotePort} connected`);

let unpipe = readable => {
  readable.unpipe();
  return 'client disconnected'
};

socket
  .on(`end`, () => { console.log(`end: ${unpipe(stimuli)}`); })
  .on(`close`, () => { console.log(`close: ${unpipe(stimuli)}`); })
  .on(`error`, () => { console.log(`error: ${unpipe(stimuli)}`); })
;

*/

