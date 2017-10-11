"use strict";
const
  Net = require('net')
  , ntStimuli = new require('stream').PassThrough({objectMode: true})
  , {EBMLReader, OVReader, Stimuli, DSProcessor, EpochsProcessor, Classifier, DecisionMaker, Stringifier, NTVerdictStringifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , ntDecisionStringifier = new Stringifier({
    chunkBegin: `{"class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellConceived", "cellId": `
    , chunkEnd: `, "timestamp": ${new Date().getTime()}}\r\n`
    // , endWith: `\r\n`
    // , indentationSpace: 2
    // , stringifyAll: true
  })
  , ntrainerStringifier = new NTVerdictStringifier({
    chunkBegin: `{"class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventClassifierResult", "cells": [`
    , chunkEnd: `]}`
    , chunksDelimiter: `,`
    // , indentationSpace: 2
    // , stringifyAll: true
    // , endWith: `\r\n`
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
      else if (!context.expectedEBMLChunkSize)
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
  , samples = new OVReader({})
  , epochs = new DSProcessor({
    stimuli: ntStimuli
    , samples: openVibeJSON.pipe(samples)
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  })
  , featuresProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: false
    , depth: config.signal.dsp.horizontal.depth
    , maximumCycleCount: config.decision.queue
    , stimuliIdArray: config.stimulation.sequence.stimuli
  })
  , classifier = new Classifier({
    method: config.classification.method
  })
  , decisions = new DecisionMaker({
    start: config.decision.start
    , maxLength: config.decision.queue
    , decisionThreshold: config.decision.threshold
    , method: config.decision.method
  })
;

let
  stimuli = {}
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
        // this.pipe(process.stdout);
        console.log(chunk.toString());
        let message = JSON.parse(chunk.toString());
        switch (message.class) {
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings"://SETTINGS
            console.log(`Incoming message:\r\n ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings`);
            console.log(`OK`);
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings"://SCENE SETTINGS
            // if(stimuli) stimuli.unpipe();
            // ntStimuli.pause();
            // featuresProcessor.setStimuliArray(message.objects);
            config.stimulation.sequence.stimuli = message.objects;//TODO changing options in config object and file
            console.log(`Incoming message:\r\nclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings`);
            console.log(`objects: ${JSON.stringify(message.objects)}`);
            // stimuli.pipe(ntStimuli);
            stimuli = new Stimuli({
              stimuliArray: config.stimulation.sequence.stimuli
              , signalDuration: config.stimulation.duration
              , pauseDuration: config.stimulation.pause
            });
            ntStimuli.resume();
            running = true;
            mode = 'vr';
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart":
            if(stimuli) stimuli.unpipe();
            // featuresProcessor.setStimuliArray(message.objects);
            config.stimulation.sequence.stimuli = message.cells;//TODO changing options in config object and file
            config.stimulation.duration = message.flashDuration;//TODO changing options in config object and file
            config.stimulation.pause = message.stepDelay;//TODO changing options in config object and file
            stimuli = new Stimuli({
              stimuliArray: config.stimulation.sequence.stimuli
              , signalDuration: config.stimulation.duration
              , pauseDuration: config.stimulation.pause
            });
            console.log(`Incoming message:\r\nclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStart`);
            console.log(`\r\nsignalDuration: ${JSON.stringify(message.flashDuration)}`);
            console.log(`\rpauseDuration: ${JSON.stringify(message.stepDelay)}`);
            console.log(`\r\nStimuli flow has started...\r\n`);
            // if (running)
            stimuli.pipe(ntStimuli);
            // mode = 'carousel';
            break;
          case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop":
            console.log(`Incoming message: \r\nru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop`);
            stimuli.unpipe();
            ntStimuli.unpipe();
            if (mode === 'carousel') {
              // stimuli = {};
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
    console.log(`\r\n ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\r\n to change server configuration use file config.json in the same directory as mbEEG.exe is\r\n\r\n`)
  });

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));
mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));


