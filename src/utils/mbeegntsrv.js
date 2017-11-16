"use strict";

const
  Net = require('net')
  , log = require('debug')('utils:mbeegntsrv')
  , fs = require('fs')
  , fileStimuli = fs.createWriteStream(`./logs/00stim.csv`)
  , fileSamples = fs.createWriteStream(`./logs/01samp.csv`)
  , fileEpochsRawH = fs.createWriteStream(`./logs/10ep-raw-h.csv`)
  , fileEpochsFilterH = fs.createWriteStream(`./logs/20ep-filt-h.csv`)
  , fileEpochsDetrendH = fs.createWriteStream(`./logs/30ep-detr-h.csv`)
  , fileEpochsDetrendNormH = fs.createWriteStream(`./logs/32ep-detr-norm-h.csv`)
  , fileFeaturesH = fs.createWriteStream(`./logs/40feat-h.csv`)
  , fileFeaturesWindowedH = fs.createWriteStream(`./logs/50featw-h.csv`)
  , fileVerdictsAbsH = fs.createWriteStream(`./logs/60verdabs-h.csv`)
  , fileVerdictsNormH = fs.createWriteStream(`./logs/62verdnorm-h.csv`)
  // , fileEpochsRawV = fs.createWriteStream(`./logs/11ep-raw-v.csv`)
  // , fileEpochsFilterV = fs.createWriteStream(`./logs/21ep-filt-v.csv`)
  // , fileEpochsDetrendV = fs.createWriteStream(`./logs/31ep-detr-v.csv`)
  // , fileEpochsDetrendNormV = fs.createWriteStream(`./logs/32ep-detr-norm-v.csv`)
  // , fileFeaturesV = fs.createWriteStream(`./logs/41feat-v.csv`)
  , {PassThrough} = require('stream')
  , ntStimuli = new PassThrough({objectMode: true})
  // , passThrough= new PassThrough({objectMode: true})
  // , epochsToRawLogH = new PassThrough({objectMode: true})
  // , epochsToFilteredLogH = new PassThrough({objectMode: true})
  // , epochsToDetrendedLogH = new PassThrough({objectMode: true})
  // , epochsToRawLogV = new PassThrough({objectMode: true})
  // , epochsToFilteredLogV = new PassThrough({objectMode: true})
  // , epochsToDetrendedLogV = new PassThrough({objectMode: true})
  , {
    EBMLReader, OVReader, Sampler,
    Epochs, DSVProcessor, EpochSeries, DSHProcessor, Classifier, Decisions, Tools,
    EpochsHorizontalLogger, /*EpochsVerticalLogger, */FeatureHorizontalLogger, FeatureVerticalLogger,
    Stringifier, NTVerdictStringifier
  } = require('mbeeg')
  , stimuler = new Sampler()
  , sampler = new Sampler()
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
  , epochsFilteredH = new EpochsHorizontalLogger()
  , epochsDetrendedH = new EpochsHorizontalLogger()
  , epochsDetrendedNormalizedH = new EpochsHorizontalLogger()
  // , epochsRawV = new EpochsVerticalLogger()
  // , epochsFilteredV = new EpochsVerticalLogger()
  // , epochsDetrendedV = new EpochsVerticalLogger()
  // , epochsDetrendedNormalizedV = new EpochsVerticalLogger()
  , featuresH = new FeatureHorizontalLogger({
    stimuliIdArray: config.stimulation.sequence.stimuli
  })
  , featuresWindowedH = new FeatureHorizontalLogger({
    stimuliIdArray: config.stimulation.sequence.stimuli
    , start: config.classification.methods.absIntegral.start
    , window: config.classification.methods.absIntegral.window
  })
  , featuresV = new FeatureVerticalLogger({
    stimuliIdArray: config.stimulation.sequence.stimuli
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
  , samples = new OVReader()
  , epochs = new Epochs({//epochizator
    stimuli: ntStimuli
    , samples: openVibeJSON.pipe(samples)
    , cycleLength: config.stimulation.sequence.stimuli.length
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
  })
  , butterworth4 = new DSVProcessor({
    action: Tools.butterworth4Bulanov
    , actionParameters: config.signal.dsp.vertical.methods.butterworth4Bulanov
  })
  , detrend = new DSVProcessor({
    action: Tools.detrend
    , actionParameters: config.signal.dsp.vertical.methods.detrend
  })
  , detrendNormalized = new DSVProcessor({
    action: Tools.detrend
    , actionParameters: config.signal.dsp.vertical.methods.detrendNormalized
  })
  , epochSeries = new EpochSeries({
    stimuliIdArray: config.stimulation.sequence.stimuli
    // , depth: config.decision.methods.majority.cycles
    , incremental: config.signal.dsp.horizontal.methods.absIntegral.incremental
  })
  , features = new DSHProcessor()
  , classifier = new Classifier({
    method: Tools.absIntegral
    , methodParameters: config.classification.methods.absIntegral
    , postprocessing: Tools.normalizeVectorBySum
  })
  , classifierAbs = new Classifier({
    method: Tools.absIntegral
    , methodParameters: config.classification.methods.absIntegral
  })
  , verdictsAbs = new Sampler()//TODO unify sampling and other logging preparations in mbeeg.Tools helpers library
  , verdictsNorm = new Sampler()
  , decisions = new Decisions(config.decision.methods.majority)
;

let
  stimuliIdArray = []
  , stimulusNumber = -1
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
                  log(`  ::mbeegntsrv::OnData::: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSettings`);
                  console.log(`NT have started.`);
                  break;
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings"://SCENE SETTINGS
                  stimuliIdArray = message.objects;
                  if (!lastEpoch)
                    lastEpoch = config.signal.cycles * stimuliIdArray.length - 1;
                  log(`::NT scene settings:: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings`);
                  log(`::NT scene settings:: stimuli idarray: ${JSON.stringify(stimuliIdArray)}`);
                  epochs.reset(stimuliIdArray.length);
                  epochSeries.reset(stimuliIdArray);
                  featuresH.setStimuliIdArray(stimuliIdArray);
                  featuresWindowedH.setStimuliIdArray(stimuliIdArray);
                  featuresV.setStimuliIdArray(stimuliIdArray);
                  running = true;
                  ntStimuli.resume();
                  break;
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegFlashStop":
                  log(`::NT stops stimulation`);
                  running = false;
                  ntStimuli.pause();
                  console.log(`Stimuli flow has stopped...`);
                  break;
                case "ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegEventCellFlashing":
                  if (running) {
                    stimulusNumber++;
                    stimulus = [message.timestamp, message.cellId, 0];
                    ntStimuli.write(stimulus);
                    
                    if (lastEpoch) {
                      log(`  ::NT has sent next stimulus [${[stimulus]}] key/#/cycle ${stimulus[1]}/${stimulusNumber}/${Math.floor(stimulusNumber / stimuliIdArray.length)}; last epoch/cycle set to ${lastEpoch}/${Math.floor(lastEpoch / stimuliIdArray.length)}`);
                      if (stimulusNumber > lastEpoch) {
                        log(`  ::Exit due to reaching cycles limit set by config.signal.cycles`);
                        fileStimuli.end();
                        fileSamples.end();
                        fileEpochsRawH.end();
                        // fileEpochsRawV.end();
                        fileEpochsFilterH.end();
                        // fileEpochsFilterV.end();
                        fileEpochsDetrendH.end();
                        // fileEpochsDetrendV.end();
                        fileEpochsDetrendNormH.end();
                        // fileEpochsDetrendNormV.end();
                        fileFeaturesH.end();
                        // fileFeaturesV.end();
                        fileFeaturesWindowedH.end();
                        process.exit(0);
                      }
                    } else
                      log(`  ::NT has sent next stimulus [${[stimulus]}]; key/#/cycle ${stimulus[1]}/${stimulusNumber}/${Math.floor(stimulusNumber / stimuliIdArray.length)}; `);
                  }
                  break;
                default:
                  log("NT has sent undefined message...");
              }
            }
          }
        });
      
      mbEEGServer.getConnections((err, count) => {
        console.log(`Connections count is ${count}`);
        if (count === 1) {
          if (config.signal.cycles) {//log samples, epochs and features into files
            ntStimuli
              .pipe(stimuler)
              .pipe(fileStimuli);
            samples
              .pipe(sampler)
              .pipe(fileSamples);
            epochs
              .pipe(butterworth4)
              .pipe(detrendNormalized)
              .pipe(epochSeries)
              .pipe(features);
            
            //output epochs data to files
            epochs
              .pipe(epochsRawH)
              .pipe(fileEpochsRawH);
            butterworth4
              .pipe(detrend)
              .pipe(epochsDetrendedH)
              .pipe(fileEpochsDetrendH);
            butterworth4
              .pipe(epochsFilteredH)
              .pipe(fileEpochsFilterH);
            detrendNormalized
              .pipe(epochsDetrendedNormalizedH)
              .pipe(fileEpochsDetrendNormH);
            features
              .pipe(featuresH)
              .pipe(fileFeaturesH);
            features
              .pipe(featuresWindowedH)
              .pipe(fileFeaturesWindowedH);
            // epochs.pipe(epochsRawV).pipe(fileEpochsRawV);
            // butterworth4.pipe(epochsFilteredV).pipe(fileEpochsFilterV);
            // detrend.pipe(epochsDetrendedV).pipe(fileEpochsDetrendV);
            // detrendNormalized.pipe(epochsDetrendedNormalizedV).pipe(fileEpochsDetrendNormV);
            // features.pipe(featuresV).pipe(fileFeaturesV);
          } else {
            epochs
              .pipe(butterworth4)
              .pipe(detrendNormalized)
              .pipe(epochSeries)
              .pipe(features);
          }
          //start piping to first connected socket
          features.pipe(classifier);
          features.pipe(classifierAbs);
          classifierAbs.pipe(verdictsAbs).pipe(fileVerdictsAbsH);
          classifier.pipe(verdictsNorm).pipe(fileVerdictsNormH);
          //classifier.pipe to csv and then to file
          classifier.pipe(ntVerdictStringifier).pipe(socket);
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

// let ovConnAttemptCounter = 1;
openVibeClient
  .on(`close`, () => {
    console.log(`OpenViBE connection closed.`);
    // console.log(`OpenViBE connection closed. Trying to reconnect ...`);
    // while (true) {
    //   setInterval(() => {
    //     openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    //   }, 5000);
    //   ovConnAttemptCounter++;
    // }
  })
// .on(`error`, error => {
//   console.log(`No response from OpenViBE acquisition server.
// Connection attempt ${ovConnAttemptCounter} failed.`)
// })
;
mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));

