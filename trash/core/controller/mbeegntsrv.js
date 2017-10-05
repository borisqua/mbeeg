"use strict";
const
  Net = require('net')
  , ntStimuli = new require('stream').PassThrough({objectMode: true})
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
  , ntDecisionStringifier = new Stringifier({
    chunkBegin: `{
    "class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellConceived",\r\n
    "cellId": `
    , chunkEnd: `,\r\n
    "timestamp": ${new Date().getTime()}\r\n
    }\r\n`
    , indentationSpace: 2
    , stringifyAll: true
  })
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
  })
  , epochs = new DSProcessor({
    stimuli: ntStimuli
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

let
  stimuli = {}
  , stimuliArray = config.stimulation.sequence.stimuli
  , signalDuration = config.stimulation.duration
  , pauseDuration = config.stimulation.pause
  , stimulus = []
  , mode = 'vr'
  , running = false
;

const
  mbEEGServer = Net.createServer(socket => {
    console.log(`client ${socket.remoteAddress}:${socket.remotePort} connected`);
    
    socket
      .on(`end`, () => {
        ntStimuli.unpipe();
        stimuli.unpipe();
        console.log('end: client disconnected');
      })
      .on(`close`, () => {
        ntStimuli.unpipe();
        stimuli.unpipe();
        console.log('close: client disconnected');
      })
      .on(`error`, () => {
        ntStimuli.unpipe();
        stimuli.unpipe();
        console.log('error: client disconnected');
      })
      .on('data', chunk => {
        let message = JSON.parse(chunk.toString());
        switch (message.class) {
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings":
            console.log(`Incoming message:\r\n ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings`);
            console.log(`OK`);
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings":
            stimuliArray = message.object;//TODO changing options in config object and file
            console.log(`Incoming message:\r\nclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings`);
            console.log(`objects: ${JSON.stringify(message.objects)}`);
            running = true;
            mode = 'vr';
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart":
            signalDuration = message.flashDuration;//TODO changing options in config object and file
            pauseDuration = message.stepDelay;//TODO changing options in config object and file
            stimuli = new Stimuli({
              stimuliArray: config.stimulation.sequence.stimuli
              , signalDuration: config.stimulation.duration
              , pauseDuration: config.stimulation.pause
            });
            console.log(`Incoming message:\r\nclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart`);
            console.log(`\r\nsignalDuration: ${JSON.stringify(message.flashDuration)}`);
            console.log(`\rpauseDuration: ${JSON.stringify(message.stepDelay)}`);
            console.log(`\r\nStimuli flow has started...\r\n`);
            if (running)
              stimuli.pipe(ntStimuli);
            mode = 'carousel';
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop":
            console.log(`Incoming message: \r\nru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop`);
            if (mode === 'carousel') {
              stimuli.unpipe();
            }
            ntStimuli.unpipe();
            running = false;
            console.log(`Stimuli flow has stopped...`);
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellFlashing":
            if (running) {
              stimulus = [message.timestamp, message.cellId, 0];
              ntStimuli.resume();
              ntStimuli.write(stimulus);
            }
            break;
          default:
            console.log("ntClient::undefined message...");
        }
      });
    
    mbEEGServer.getConnections((err, count) => {
      console.log(`Connections count is ${count}`);
      if (count === 1) {
        // ntStimuli.pipe(plainStringifier).pipe(socket);//test
        // stimuli.pipe(stimulusStringifier).pipe(socket);//test
        // openVibeJSON.pipe(ovStringifier).pipe(process.stdout);
        // samples.pipe(plainStringifier).pipe(process.stdout);
        // samples.pipe(sampleStringifier).pipe(process.stdout);
        // epochs.pipe(channelsMonitor).pipe(process.stdout);
        // epochs.pipe(epochsStringifier).pipe(socket);//process.stdout);
        // epochsStringifier.pipe(fs.createWriteStream(`${appRoot}/epochs.json`));
        // featuresProcessor.pipe(plainStringifier).pipe(process.stdout);
        // featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
        // featuresProcessor.pipe(classifier).pipe(plainStringifier).pipe(process.stdout);
        // featuresProcessor.pipe(classifier).pipe(verdictStringifier).pipe(process.stdout);
        // featuresProcessor.pipe(classifier).pipe(decisions).pipe(decisionStringifier).pipe(process.stdout);
        // featuresProcessor.pipe(classifier).pipe(ntrainerStringifier).pipe(process.stdout);
        featuresProcessor.pipe(classifier).pipe(ntrainerStringifier).pipe(socket);
        classifier.pipe(decisions).pipe(ntDecisionStringifier).pipe(socket);
      } else {
        // plainStringifier.pipe(socket);//test
        // stimulusStringifier.pipe(socket);//test
        ntrainerStringifier.pipe(socket);
        ntDecisionStringifier.pipe(socket);
      }
    });
  }).listen({port: config.service.port, host: config.service.host, exclusive: true}, () => {
    console.log(`\r\n ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\r\n to change server configuration use file config.json in the same directory as mbEEG.exe is\r\n\r\n`)
  });

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));
mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));


