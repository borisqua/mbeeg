"use strict";
const
  Net = require('net')
  , fs = require('fs')
  , cli = require('commander')
  , {PassThrough, Transform} = require('stream')
  , ntStimuli = new PassThrough({objectMode: true})
  , {EBMLReader, OVReader, /*Stimuli,*/ DSProcessor, EpochsProcessor, Classifier, DecisionMaker, Stringifier, NTVerdictStringifier, Tools} = require('mbeeg')
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

cli.version('0.0.1')
  .description(`mbEEG server processes openViBE EEG Stream to detect P300 ERP signal and recognize user selection with variety of different filter and recognition algorithms.
  \rIt can be used also as a tool to getting, saving and analyzing data flows emerged in the process of P300 ERP signal
  \rrecognition.`)
  .usage(`[option]`)
  .option(`-c --cycles-limit <n>`, `Set cycles number to go`, parseInt)
  .option(`-e --eeg [path]`, `Log eeg samples into file (default ./00-samples.csv)`)
  .option(`-r --raw-epochs [path]`, `Log epochs with raw data (default ./01-epochs-raw.csv)`)
  .option(`-f --filtered-epochs [path]`, `Log epochs with filtered data (default ./02-epochs-filtered.csv)`)
  .option(`-d --detrended-epochs [path]`, `Log epochs with detrended data (default ./03-epochs-detrended.csv)`)
  .option(`-a --averaged-features [path]`, `Log features with averaged data (default ./04-features-averaged.csv)`)
  .parse(process.argv)
;

let
  stimulus = []
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
                config.stimulation.sequence.stimuli = message.objects;//TODO changing options in config object and file
                console.log(`--DEBUG::mbeegntsrv::OnData::\r\nclass: ru.itu.parcus.modules.neurotrainer.modules.mbeegxchg.dto.MbeegSceneSettings`);
                console.log(`objects: ${JSON.stringify(message.objects)}`);
                featuresProcessor.reset(message.objects);
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
                  // ntStimuli.resume();
                  console.log(`--DEBUG::mbeegntsrv::OnData::MbeegEventCellFlashing ${[stimulus]}`);
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
        //Start output to files if corresponding options specified
        if (cli.eeg) { //create 00-samples.csv
          const sampler = new Transform({
            objectMode: true,
            transform(samples, encoding, cb) {
              for (let s = 0; s < samples.length; s++)
                cb(null, `${samples[s][0]}, ${samples[s][1]}, ${samples[s][2]}\r\n`);
            }
          });
          let fileWithSamples = fs.createWriteStream(`./00-samples.csv`);
          samples.pipe(sampler).pipe(fileWithSamples);
        }
        if (cli.rawEpochs) { //create 01-epochs-raw.csv
          const
            epochsRawStringifier = new Stringifier({
              beginWith: `{"epochs": [`
              , chunksDelimiter: `,`
              , chunkEnd: `\r\n`
              , endWith: `]}\r\n`
              // , stringifyAll: true
              , indentationSpace: 2
            })
            , epochsRaw = new DSProcessor({
              stimuli: ntStimuli
              , samples: openVibeJSON.pipe(samples)
              , channels: config.signal.channels
              , epochDuration: config.signal.epoch.duration
              , processingSequence: []
              , cyclesLimit: config.signal.cycles
            });
          let fileWithRawEpochs = fs.createWriteStream(`./01-epochs-raw.csv`);
          epochsRaw.pipe(epochsRawStringifier).pipe(fileWithRawEpochs);
        }
        if (cli.filteredEpochs) { //create 02-epochs-filtered.csv
          const
            epochsFilteredStringifier = new Stringifier({
              beginWith: `{"epochs": [`
              , chunksDelimiter: `,`
              , chunkEnd: `\r\n`
              , endWith: `]}\r\n`
              // , stringifyAll: true
              , indentationSpace: 2
            })
            , epochsFiltered = new DSProcessor({
              stimuli: ntStimuli
              , samples: openVibeJSON.pipe(samples)
              , channels: config.signal.channels
              , epochDuration: config.signal.epoch.duration
              , processingSequence: config.signal.dsp.vertical.steps.slice(0, 1)
              , cyclesLimit: config.signal.cycles
            })
          let fileWithFilteredEpochs = fs.createWriteStream(`./02-epochs-filtered.csv`);
          epochsFiltered.pipe(epochsFilteredStringifier).pipe(fileWithFilteredEpochs);
        }
        if (cli.detrendedEpochs) { //create 03-epochs-detrended.csv
          const
            epochsDetrendedStringifier = new Stringifier({
              beginWith: `{"epochs": [`
              , chunksDelimiter: `,`
              , chunkEnd: `\r\n`
              , endWith: `]}\r\n`
              // , stringifyAll: true
              , indentationSpace: 2
            })
            , epochsDetrended = new DSProcessor({
              stimuli: ntStimuli
              , samples: openVibeJSON.pipe(samples)
              , channels: config.signal.channels
              , epochDuration: config.signal.epoch.duration
              , processingSequence: config.signal.dsp.vertical.steps.slice(0, 2)
              , cyclesLimit: config.signal.cycles
            });
          let fileWithDetrendedEpochs = fs.createWriteStream(`./03-epochs-detrended.csv`);
          epochsDetrended.pipe(epochsDetrendedStringifier).pipe(fileWithDetrendedEpochs);
        }
        if (cli.averagedEpochs) { //create 04-features-averaged.csv
          const featuresStringifier = new Stringifier({
            chunkEnd: `\r\n`
            , indentationSpace: 2
          });
          let fileWithAvgFeatures = fs.createWriteStream(`./04-features-averaged.csv`);
          featuresProcessor.pipe(featuresStringifier).pipe(fileWithAvgFeatures);
        }
        //start casting to first connected socket
        featuresProcessor.pipe(classifier).pipe(ntVerdictStringifier).pipe(socket);
        classifier.pipe(decisions).pipe(ntDecisionStringifier).pipe(socket);
      } else {
        //cast existing streams to just connected next sockets
        ntVerdictStringifier.pipe(socket);
        ntDecisionStringifier.pipe(socket);
      }
    });
  }).listen({port: config.service.port, host: config.service.host, exclusive: true}, () => {
    console.log(`\r\n ... mbEEG TCP server started at ${config.service.host}:${config.service.port} ...\n
    \r - to change server configuration use file config.json in the same directory as mbeegntsrv.exe
    \r - to get help run with -h or --help option
    \r\n\r\n`)
  });

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));
mbEEGServer.on(`close`, () => console.log(`mbEEG sever verdict service closed.`));

