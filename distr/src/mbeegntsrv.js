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
    chunkBegin: `\n\r{
    "class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellConceived",\n\r
    "cellId": `
    , chunkEnd: `,\n\r
    "timestamp": ${new Date().getTime()}\n\r
    }\n\r`
    , indentationSpace: 2
    , stringifyAll: true
  })
  , ntrainerStringifier = new NTVerdictStringifier({
    chunkBegin: `\n\r{
    "class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventClassifierResult",
    "cells": [`
    , chunkEnd: `]}\n\r`
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
  , tcpFeeder = (context, tcpchunk) => {
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
    , ebmlCallback: tcpFeeder
  })
  , samples = new OVReader({
    ovStream: openVibeJSON
    // , signalDescriptor: signalGlobalsDescriptor
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
        // ntStimuli.unpipe();
        stimuli.unpipe();
        console.log('end: client disconnected');
      })
      .on(`close`, () => {
        // ntStimuli.unpipe();
        stimuli.unpipe();
        console.log('close: client disconnected');
      })
      .on(`error`, () => {
        // ntStimuli.unpipe();
        // stimuli.unpipe();
        console.log('error: client disconnected');
      })
      .on('data', chunk => {//to unpipe delete listener
        console.log(chunk.toString());
        let message = JSON.parse(chunk.toString());
        switch (message.class) {
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings":
            console.log(`Incoming message:\n\r ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings`);
            console.log(`OK`);
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings":
            stimuliArray = message.object;//TODO changing options in config object and file
            console.log(`Incoming message:\n\rclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings`);
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
            console.log(`Incoming message:\n\rclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart`);
            console.log(`\n\rsignalDuration: ${JSON.stringify(message.flashDuration)}`);
            console.log(`\rpauseDuration: ${JSON.stringify(message.stepDelay)}`);
            console.log(`\n\rStimuli flow has started...\n\r`);
            if (running)
              stimuli.pipe(ntStimuli);
            mode = 'carousel';
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop":
            console.log(`Incoming message: \n\rru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop`);
            if (mode === 'carousel') {
              stimuli = {};
              // stimuli.unpipe();
              // stimuli.drain();
            }
            // ntStimuli.unpipe();
            // ntStimuli.drain();
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
    console.log(`\n\r ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\n\r to change server configuration use file config.json in the same directory as mbEEG.exe is\n\r\n\r`)
  });

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));
mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));


