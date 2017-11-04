"use strict";
const
  Net = require('net')
  , fs = require('fs')
  , fileSamples = fs.createWriteStream(`./logs/00samp.csv`)
  , fileEpochsRawH = fs.createWriteStream(`./logs/10epraw.csv`)
  , fileEpochsRawV = fs.createWriteStream(`./logs/11epraw.csv`)
  , fileEpochsFilterH = fs.createWriteStream(`./logs/20epfilt.csv`)
  , fileEpochsFilterV = fs.createWriteStream(`./logs/21epfilt.csv`)
  , fileEpochsDetrendH = fs.createWriteStream(`./logs/30epdetr.csv`)
  , fileEpochsDetrendV = fs.createWriteStream(`./logs/31epdetr.csv`)
  , fileEpochsDetrendNormH = fs.createWriteStream(`./logs/32epdetr.csv`)
  , fileEpochsAvgH = fs.createWriteStream(`./logs/40epavg.csv`)
  , fileEpochsAvgV = fs.createWriteStream(`./logs/41epavg.csv`)
  , fileFeaturesH = fs.createWriteStream(`./logs/50feat.csv`)
  , fileFeaturesV = fs.createWriteStream(`./logs/51feat.csv`)
  , {PassThrough} = require('stream')
  , ntStimuli = new PassThrough({objectMode: true})
  // , epochsToFeatureProcessor = new PassThrough({objectMode: true})
  // , epochsToRawLogH = new PassThrough({objectMode: true})
  // , epochsToFilteredLogH = new PassThrough({objectMode: true})
  // , epochsToDetrendedLogH = new PassThrough({objectMode: true})
  // , epochsToRawLogV = new PassThrough({objectMode: true})
  // , epochsToFilteredLogV = new PassThrough({objectMode: true})
  // , epochsToDetrendedLogV = new PassThrough({objectMode: true})
  , { EBMLReader, OVReader, Sampler,
    Epochs, DSVProcessor, DSHProcessor, EpochsHorizontalLogger, EpochsVerticalLogger,
    FeatureHorizontalLogger,
    Classifier, DecisionMaker, Stringifier, NTVerdictStringifier, Tools } = require('mbeeg')
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
  , epochsRawH = new EpochsHorizontalLogger()
  , epochsRawV = new EpochsVerticalLogger()
  , epochsFilteredH = new EpochsHorizontalLogger()
  , epochsFilteredV = new EpochsVerticalLogger()
  , epochsDetrendedH = new EpochsHorizontalLogger()
  , epochsDetrendedV = new EpochsVerticalLogger()
  , epochsDetrendedNormalizedH = new EpochsHorizontalLogger()
  , epochsDetrendedNormalizedV = new EpochsVerticalLogger()
  , featuresH = new FeatureHorizontalLogger({
    stimuliIdArray: config.stimulation.sequence.stimuli
  })
  // , featuresStringifier = new Stringifier({
  //   chunkEnd: `\r\n`
  //   , indentationSpace: 2
  // })
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
  , samples = new OVReader()
  , epochs = new Epochs({//epochizator
    stimuli: ntStimuli
    , samples: openVibeJSON.pipe(samples)
    , cycleLength: config.stimulation.sequence.stimuli.length
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  })
  , butterworth4 = new DSProcessor({
    action: Tools.butterworth4Bulanov
    , actionParameters: config.signal.dsp.vertical.methods.butterworth4Bulanov
  })
  , detrend = new DSProcessor({
    action: Tools.detrend
    , actionParameters: config.signal.dsp.vertical.methods.detrend
  })
  , detrendNormalized = new DSProcessor({
    action: Tools.detrend
    , actionParameters: config.signal.dsp.vertical.methods.detrendNormalized
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
  , featuresProcessor = {}
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
                  epochs.setCyclesLength(stimuliIdArray.length);
                  featuresProcessor.reset(stimuliIdArray);
                  featuresH.setStimuliIdArray(stimuliIdArray);
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
                        fileSamples.end();
                        fileEpochsRawH.end();
                        fileFeaturesH.end();
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
          if (config.signal.cycles) {//log samples, epochs and features into files
            samples.pipe(sampler).pipe(fileSamples);
            epochs.pipe(epochsRawH).pipe(fileEpochsRawH);
            epochs.pipe(epochsRawV).pipe(fileEpochsRawV);
            epochs.pipe(butterworth4);
            butterworth4.pipe(epochsFilteredH).pipe(fileEpochsFilterH);
            butterworth4.pipe(epochsFilteredV).pipe(fileEpochsFilterV);
            butterworth4.pipe(detrend);//TODO if move this line before pipe to file (2 lines up) then detrend modifies butterworth file output
            butterworth4.pipe(detrendNormalized);
            detrend.pipe(epochsDetrendedH).pipe(fileEpochsDetrendH);
            detrend.pipe(epochsDetrendedV).pipe(fileEpochsDetrendV);
            detrendNormalized.pipe(epochsDetrendedNormalizedH).pipe(fileEpochsDetrendNormH);
            featuresProcessor = new EpochsProcessor({//featurizator
              epochs: detrend
              , moving: false
              , depth: config.signal.dsp.horizontal.depth
              , maximumCycleCount: config.decision.methods.majority.cycles //TODO consider reset of maximumCycleCount according to decisionmaker's reset of decision cycle
              , stimuliIdArray: config.stimulation.sequence.stimuli
            });
            featuresProcessor.pipe(featuresH).pipe(fileFeaturesH);
            // samples.pipe(sampler).pipe(plainSamplesStringifier).pipe(process.stdout);
            // epochs.pipe(epochsRawStringifier).pipe(process.stdout);
            // featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
          } else {
            featuresProcessor = new EpochsProcessor({//featurizator
              epochs: epochs.pipe(butterworth4).pipe(detrend)
              , moving: false
              , depth: config.signal.dsp.horizontal.depth
              , maximumCycleCount: config.decision.methods.majority.cycles //TODO consider reset of maximumCycleCount according to decisionmaker's reset of decision cycle
              , stimuliIdArray: config.stimulation.sequence.stimuli
            });
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

