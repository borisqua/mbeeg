"use strict";
//TODO tests for each step of controller algorithm
const
  Net = require('net')
  , repl = require('repl')
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
    chunkEnd: `\n\r`
  })
  , stimulusStringifier = new Stringifier({
    chunkBegin: `{"stimulus":`
    , chunksDelimiter: ``
    , chunkEnd: `}\n\r`
  })
  , ovStringifier = new Stringifier({
    beginWith: `{\n\r`
    , chunkBegin: `"openViBE_Stream":`
    , chunksDelimiter: `, `
    , chunkEnd: `}`
    , endWith: `}`
    , indentationSpace: 2
  })
  , sampleStringifier = new Stringifier({
    chunkBegin: `{"sample":`
    , chunkEnd: `}\n\r`
  })
  , epochsStringifier = new Stringifier({
    beginWith: `{"epochs": [\n`
    , chunkBegin: `\n\r`
    , chunksDelimiter: `,`
    , chunkEnd: `\n\r`
    , endWith: `]}`
    // , indentationSpace: 2
  })
  , featuresStringifier = new Stringifier({
    // beginWith: `{"features":[\n\r`
    chunkBegin: `{"feature":\n\r`
    // , chunksDelimiter: `,\n\r `
    , chunkEnd: `}`
    // , endWith: `]}`
  })
  , verdictStringifier = new Stringifier({
    chunkBegin: `{"verdict":`
    , chunkEnd: `}\n\r`
  })
  , decisionStringifier = new Stringifier({
    chunkBegin: `{"decision":`
    , chunkEnd: `}\n\r`
  })
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , provideTCP = (context, data) => {
    let start = 0;//start of next chunk in data
    
    if (!context.expectedEBMLChunkSize) {//first or new, after previous completion, openViBE chunk received by tcp client
      context.ebmlChunk = Buffer.alloc(0);
      context.expectedEBMLChunkSize = 0;
      context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by
                                                                // openViBE
      data = data.slice(8);//trim openViBE specific TCP header, so now ebmlChunk is pure EBML data
    }
    let actualSizeOfTCPData = data.length;//actualSize of ebml data presented in current tcp data chunk
    
    if (actualSizeOfTCPData && context.expectedEBMLChunkSize) {//if ebml data present and ebml chunk size from openViBE tcp pack header present too
      while (actualSizeOfTCPData > context.expectedEBMLChunkSize) {
        context.ebmlChunk = Buffer.from(data, start, context.expectedEBMLChunkSize);
        context.write(context.ebmlChunk);
        start += context.expectedEBMLChunkSize;
        context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by
                                                                  // openViBE
      }
      if (actualSizeOfTCPData <= context.expectedEBMLChunkSize) {//actual chunk length is less then required as prescribed in ov tcp pack header (due some network problems e.g.)
        context.expectedEBMLChunkSize -= actualSizeOfTCPData;//decrease size of expected but not received ebml data by
                                                             // amount of received data
        context.ebmlChunk = Buffer.concat([context.ebmlChunk, data]);//assemble chunk to the full ebmlChunkSize before
                                                                     // write ebmlChunk into ebml reader
        if (!context.expectedEBMLChunkSize) {
          // reader.write(context.ebmlChunk);
          context.write(context.ebmlChunk);
          context.ebmlChunk = Buffer.alloc(0);
        }
      }
    }
  }
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    , ebmlCallback: provideTCP
  })
  , samples = new OVReader({
    ovStream: openVibeJSON
    // , signalDescriptor: signalGlobalsDescriptor
  })
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliArray: config.stimulation.sequence.stimuli
  })
  , epochs = new DSProcessor({
    stimuli: stimuli
    , samples: samples
    , cyclesLimit: config.signal.cycles
    // , samplingRate: signalGlobalsDescriptor.samplingRate
    //TODO to solve problem with passing sampling rate to DSProcessor
    , channels: config.signal.channels
    , processingSteps: ``
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
openVibeJSON.pipe(ovStringifier).pipe(process.stdout);
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
  console.log(`\n\r ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\n\r to change server configuration use file config.json in the same directory as mbEEG.exe is\n\r\n\r`)
});

mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));


// });
// cli.command(`console`)
//   .description(`write mbEEG flows into standard output. \n\r                   If you choose --open-vibe option others options will be disabled.`)
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
