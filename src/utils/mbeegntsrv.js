"use strict";
const
  Net = require('net')
  , fs = require('fs')
  , fileSamples = fs.createWriteStream(`./logs/00sample.csv`)
  , fileEpochs = fs.createWriteStream(`./logs/01epoch.csv`)
  , fileFeatures = fs.createWriteStream(`./logs/02feature.csv`)
  , ntStimuli = new require('stream').PassThrough({objectMode: true})
  , {EBMLReader, OVReader, Sampler, DSProcessor, EpochsProcessor, Classifier, DecisionMaker, Stringifier, NTVerdictStringifier, Tools} = require('mbeeg')
  , sampler = new Sampler({objectMode: true})
  , config = Tools.loadConfiguration(`config.json`)
  , ntDecisionStringifier = new Stringifier({
    chunkBegin: `{"class": "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellConceived", "cellId": `
    , chunkEnd: `, "timestamp": ${new Date().getTime()}}\r\n`
  })
  , ntVerdictStringifier = new NTVerdictStringifier({
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
  , plainSamplesStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , epochsRawStringifier = new Stringifier({
    beginWith: `{"epochs": [`
    , chunksDelimiter: `,`
    , chunkEnd: `\r\n`
    , endWith: `]}\r\n`
    // , stringifyAll: true
    , indentationSpace: 2
  })
  , featuresStringifier = new Stringifier({
    chunkEnd: `\r\n`
    , indentationSpace: 2
  })
  , openVibeClient = new Net.Socket() //create TCP client for openViBE eeg data server
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
  , epochs = new DSProcessor({//epochizator
    stimuli: ntStimuli
    , samples: openVibeJSON.pipe(samples)
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  })
  , featuresProcessor = new EpochsProcessor({//featurizator
    epochs: epochs
    , moving: false
    , depth: config.signal.dsp.horizontal.depth
    , maximumCycleCount: config.decision.cycles
    , stimuliIdArray: config.stimulation.sequence.stimuli
  })
  , decisions = new DecisionMaker({
    start: config.decision.methods.majority.start
    , maxLength: config.decision.methods.majority.cycles
    , decisionThreshold: config.decision.methods.majority.threshold
    , method: config.decision.method //TODO it's enough to point method name that is index of config object property that contains needed parameters to invoke method
  })
  , classifier = new Classifier({
    method: `integral` //TODO it's enough to point method name that is index of config object property that contains needed parameters to invoke method
    , methodParameters: config.classification.methods[`integral`]
  })
;

let
  stimuliIdArray = []
  , lastEpoch = 0
  , stimulus = []
  , running = false
;

const
  mbEEGServer = Net.createServer(socket => {
      console.log(`client ${socket.remoteAddress}:${socket.remotePort} connected`);
      
      socket
        .on(`end`, () => {
          // ntStimuli.unpipe();
          console.log('end: client disconnected');
        })
        .on(`close`, () => {
          // ntStimuli.unpipe();
          console.log('close: client disconnected');
        })
        .on(`error`, () => {
          // ntStimuli.unpipe();
          console.log('error: client disconnected');
        })
        .on('data', chunk => {//to unpipe delete listener
          let messages = chunk.toString().split(`\r\n`);
          for (let m = 0; m < messages.length; m++) {
            if (messages[m]) {
              // console.log(`Incoming-> ${messages[m]}`);
              let message = JSON.parse(messages[m]);
              // console.log(JSON.stringify(message, null, 0));
              switch (message.class) {
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings"://SETTINGS
                  console.log(`--DEBUG::mbeegntsrv::OnData:::\r\n ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings`);
                  console.log(`OK`);
                  break;
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings"://SCENE SETTINGS
                  stimuliIdArray = message.objects;
                  if (!lastEpoch)
                    lastEpoch = config.signal.cycles * stimuliIdArray.length;
                  console.log(`--DEBUG::mbeegntsrv::OnData::\r\nclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings`);
                  console.log(`objects: ${JSON.stringify(stimuliIdArray)}`);
                  featuresProcessor.reset(stimuliIdArray);
                  running = true;
                  ntStimuli.resume();
                  break;
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop":
                  console.log(`--DEBUG::mbeegntsrv::OnData::\r\nru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop`);
                  running = false;
                  ntStimuli.pause();
                  console.log(`Stimuli flow has stopped...`);
                  break;
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellFlashing":
                  if (running) {
                    stimulus = [message.timestamp, message.cellId, 0];
                    ntStimuli.write(stimulus);
                    
                    let epochInProcess = featuresProcessor.epochInWork ? featuresProcessor.epochInWork : 0;
                    if (lastEpoch) {
                      console.log(`--DEBUG::mbeegntsrv::OnData::MbeegEventCellFlashing ${[stimulus]}; cycle = ${Math.ceil(epochInProcess / stimuliIdArray.length)}; last cycle set to ${lastEpoch / stimuliIdArray.length}`);
                      if (featuresProcessor.epochInWork > lastEpoch) {
                        console.log(`--DEBUG::mbeegntsrv::OnData::MbeegEventCellFlashing - exit due to reaching cycles limit set by config.signal.cycles`);
                        process.exit(0);
                      }
                    } else
                      console.log(`--DEBUG::mbeegntsrv::OnData::MbeegEventCellFlashing ${[stimulus]}; cycle = ${Math.ceil(epochInProcess / stimuliIdArray.length)}; `);
                  }
                  break;
                default:
                  console.log("--DEBUG::mbeegntsrv::OnData:: ntClient undefined message...");
              }
            }
          }
        });
      
      mbEEGServer.getConnections((err, count) => {
        console.log(`Connections count is ${count}`);
        if (count === 1) {
          if(lastEpoch) {//log samples, epochs and features into files
            samples.pipe(sampler).pipe(plainSamplesStringifier).pipe(fileSamples);
            // samples.pipe(sampler).pipe(plainSamplesStringifier).pipe(process.stdout);
            epochs.pipe(epochsRawStringifier).pipe(fileEpochs);
            // epochs.pipe(epochsRawStringifier).pipe(process.stdout);
            featuresProcessor.pipe(featuresStringifier).pipe(fileFeatures);
            // featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
          }
          //start piping to first connected socket
          featuresProcessor.pipe(classifier).pipe(ntVerdictStringifier).pipe(socket);
          classifier.pipe(decisions).pipe(ntDecisionStringifier).pipe(socket);
          
        } else {
          
          //pipe existing stringified streams to just connected next sockets
          ntVerdictStringifier.pipe(socket);
          ntDecisionStringifier.pipe(socket);
        }
      })
      ;
    }
  ).listen({port: config.service.port, host: config.service.host, exclusive: true}, () => {
    console.log(`\r\n ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\n
    \r - to change server configuration use file config.json in the same directory as mbeegntsrv.exe
    \r - to get help run with -h or --help option
    \r\n\r\n`)
  });

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));
mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));

