"use strict";
//TODO tests for each step of controller algorithm
const
  Net = require('net')
  , fs = require('fs')
  , {
    EBMLReader,
    OVReader,
    Stimuli,
    DSProcessor,
    EpochsProcessor,
    Classifier,
    DecisionMaker,
    Stringifier,
    NTVerdictStringifier,
    Tools
  } = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , ntrainerStringifier = new NTVerdictStringifier({
    chunkBegin: `{\n"class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventClassifierResult",
    "cells": [`
    , chunkEnd: `]}\n`
    , chunksDelimiter: `,`
    , indentationSpace: 2
    , stringifyAll: true
    , fields: [
      {
        name: "class",
        type: "literal",
        content: "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegCellWeight"
      },
      {name: "cellId", type: "id"},
      {name: "weight", type: "value"}]
  })
  , plainStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , stimulusStringifier = new Stringifier({
    chunkBegin: `{"stimulus":`
    , chunksDelimiter: ``
    , chunkEnd: `}\r\n`
  })
  , ovStringifier = new Stringifier({
    beginWith: `{\r\n`
    , chunkBegin: `"openViBE_Stream":`
    , chunksDelimiter: `, `
    , chunkEnd: `}`
    , endWith: `}`
    , indentationSpace: 2
  })
  , sampleStringifier = new Stringifier({
    chunkBegin: `{"sample":`
    , chunkEnd: `}\r\n`
  })
  , epochsStringifier = new Stringifier({
    beginWith: `{"epochs": [\n`
    , chunkBegin: `\r\n`
    , chunksDelimiter: `,`
    , chunkEnd: `\r\n`
    , endWith: `]}`
    // , indentationSpace: 2
  })
  , featuresStringifier = new Stringifier({
    // beginWith: `{"features":[\r\n`
    chunkBegin: `{"feature":\r\n`
    // , chunksDelimiter: `,\r\n `
    , chunkEnd: `}`
    // , endWith: `]}`
  })
  , verdictStringifier = new Stringifier({
    chunkBegin: `{"verdict":`
    , chunkEnd: `}\r\n`
  })
  , decisionStringifier = new Stringifier({
    chunkBegin: `{"decision":`
    , chunkEnd: `}\r\n`
  })
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , tcp2ebmlFeeder = (context, tcpchunk) => {
    if (context.tcpbuffer === undefined) {
      context.tcpbuffer = Buffer.alloc(0);
      context.tcpcursor = 0;
    }
    context.tcpbuffer = Buffer.concat([context.tcpbuffer, tcpchunk]);
    let bufferTailLength = context.tcpbuffer.length - context.tcpcursor;
    while (bufferTailLength) {
      if (!context.expectedEBMLChunkSize && bufferTailLength >= 8) {
        context.expectedEBMLChunkSize = context.tcpbuffer.readUIntLE(context.tcpcursor, 8);//first Uint64LE contains length of ebml data sent by openViBE
        context.tcpcursor += 8;
        bufferTailLength -= 8;
      }
      else if(!context.expectedEBMLChunkSize)
        break;
      if (bufferTailLength >= context.expectedEBMLChunkSize) {
        context.ebmlChunk = Buffer.from(context.tcpbuffer.slice(context.tcpcursor, context.tcpcursor + context.expectedEBMLChunkSize));
        context.tcpcursor += context.expectedEBMLChunkSize;
        bufferTailLength -= context.expectedEBMLChunkSize;
        context.expectedEBMLChunkSize = 0;
      } else
        break;
      context.write(context.ebmlChunk);
    }
    if (!bufferTailLength) {
      context.tcpbuffer = Buffer.alloc(0);
      context.tcpcursor = 0;
    }
  }
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    , ebmlCallback: tcp2ebmlFeeder
  })
  , samples = new OVReader({
    ovStream: openVibeJSON
  })
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliArray: config.stimulation.sequence.stimuli
  })
  , epochs = new DSProcessor({
    stimuli: stimuli
    , samples: samples
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  })
  , featuresProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: false
    , depth: 5
    , stimuliNumber: config.stimulation.sequence.stimuli.length
  })
  , classifier = new Classifier({})
  , decisions = new DecisionMaker({
    start: config.decision.start
    , maxLength: config.decision.queue
    , decisionThreshold: config.decision.threshold
    , method: config.decision.method
  })
;

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));

/*const
  json2csv = require('json2csv')
  , epochsFromFile = require(`${appRoot}/epochs`);
for(let key of epochs){
  console.log(key)
}*/
const
  // {Channels} = require(`${appRoot}/test/testhelpers`)
  {Channels} = require('C:/Users/Boris/YandexDisk/localhost.chrome/test/testhelpers')
  , channelsMonitor = new Channels({
    // keys: [20],
    // channels: [1] //, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  });

// let fields = {};

// stimuli.pipe(plainStringifier).pipe(process.stdout);//test
// stimuli.pipe(stimulusStringifier).pipe(process.stdout);//test
// openVibeJSON.pipe(ovStringifier).pipe(process.stdout);
// samples.pipe(plainStringifier).pipe(process.stdout);
// samples.pipe(sampleStringifier).pipe(process.stdout);
// epochs.pipe(channelsMonitor).pipe(process.stdout);
// epochs.pipe(epochsStringifier).pipe(process.stdout);
// epochsStringifier.pipe(fs.createWriteStream(`${appRoot}/epochs.json`));
// featuresProcessor.pipe(plainStringifier).pipe(process.stdout);
// featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
// featuresProcessor.pipe(classifier).pipe(plainStringifier).pipe(process.stdout);
// featuresProcessor.pipe(classifier).pipe(verdictStringifier).pipe(process.stdout);
// featuresProcessor.pipe(classifier).pipe(decisions).pipe(decisionStringifier).pipe(process.stdout);
// featuresProcessor.pipe(classifier).pipe(ntrainerStringifier).pipe(process.stdout);

// const
//   cli = require('commander')
//   , colors = require('colors')
// ;
//
// cli.version(`0.0.1`)
//   .usage(`[command] [options]`)
//   .description(`mbEEG server writes json objects of stimuli, verdicts and decisions into specified TCP socket`)
//   .option(`-s, --stimuli`, `show stimuli data flow in console`)
//   .option(`-o, --open-vibe`, 'show openViBE stream json flow in console')
//   .option(`-m, --samples`, `show signal samples data flow in console`) //, /^(raw|filtered|detrended)$/i, `detrended`)
//   .option(`-e, --epochs`, `show epochs json flow in console`)
//   .option(`-f, --features`, `show features json flow in console`)
//   .option(`-v, --verdict`, `show classification data flow in console`)
//   .option(`-d, --decision`, `show final decision on current cycle in console`)
//   .option(`-j, --json`, `show data in JSON if available`)
//   .parse(process.argv);
//
// cli.command(`server <port>`).description(`run mbEEG TCP server`).action((port, options) => {});
// cli.command(`server`)
//   .description(`run mbEEG TCP server`)
//   .action(() => {


const mbEEGServer = Net.createServer(socket => {
  //5. Create and run TCP server to communicate between main process of app and renderer process of keyboard (carousel)
  console.log(`client ${socket.remoteAddress}:${socket.remotePort} connected`);
  stimuli.pipe(stimulusStringifier).pipe(socket);
  featuresProcessor.pipe(classifier).pipe(verdictStringifier).pipe(socket);
  classifier.pipe(decisions).pipe(decisionStringifier).pipe(socket);
  
  socket.on(`end`, () => {
    stimuli.unpipe();
    console.log('end: client disconnected');
  });
  socket.on(`close`, () => {
    stimuli.unpipe();
    console.log('close: client disconnected');
  });
  socket.on(`error`, () => {
    stimuli.unpipe();
    console.log('error: client disconnected');
  });
  
}).listen(config.service.port, config.service.host, () => {
  console.log(`\r\n ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\r\n to change server configuration use file config.json in the same directory as mbEEG.exe is\r\n\r\n`)
});

mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));


// });
// cli.command(`console`)
//   .description(`write mbEEG flows into standard output. \r\n                   If you choose --open-vibe option others options will be disabled.`)
//   .action(() => {
//     if (cli.stimuli)
//       if (cli.json) stimuli.pipe(stimulusStringifier).pipe(process.stdout);//test
//       else stimuli.pipe(plainStringifier).pipe(process.stdout);//test
//     if (cli.openVibe) openVibeJSON.pipe(ovStringifier).pipe(process.stdout);
//     if (cli.samples)
//       if (cli.json) samples.pipe(sampleStringifier).pipe(process.stdout);
//       else samples.pipe(plainStringifier).pipe(process.stdout);
//     if (cli.epochs) epochs.pipe(epochsStringifier).pipe(process.stdout);
//     if (cli.features)
//       if (cli.json) featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
//       else featuresProcessor.pipe(plainStringifier).pipe(process.stdout);
//     if (cli.verdict)
//       if (cli.json) featuresProcessor.pipe(classifier).pipe(verdictStringifier).pipe(process.stdout);
//       else featuresProcessor.pipe(classifier).pipe(plainStringifier).pipe(process.stdout);
// featuresProcessor.pipe(classifier).pipe(decisions).pipe(decisionStringifier).pipe(process.stdout);
// });
// cli.parse(process.argv);
// if (process.argv.length < 3) cli.help(/!*text=>colors.green(text)*!/);
