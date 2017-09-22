"use strict";
//TODO tests for each step of controller algorithm
const
  appRoot = require(`app-root-path`)
  , config = require(`${appRoot}/config`) //1. Load configuration - config.json file with stimuli, dsp and carousel parameters
  // , Signal = require(`${appRoot}/src/core/controller/signal`)
  // , signalGlobalsDescriptor = new Signal({})
  , stringifier = require(`${appRoot}/src/tools/helpers`).objectsStringifier
  , Net = require('net')
  // , verdictsSocket = new Net.Socket()
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
  , EBMLReader = require(`${appRoot}/src/tools/ebml/reader`) //parse from ebml to json
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(1024, 'localhost', () => {})
    , ebmlCallback: provideTCP
  })
  , OVReader = require(`${appRoot}/src/tools/openvibe/reader`) //extract samples from openViBE stream
  , samples = new OVReader({
    ovStream: openVibeJSON
    // , signalDescriptor: signalGlobalsDescriptor
  })
  , Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`) //2. Create stimuli provider for keyboard(carousel) and eeg/P300 classifier
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliArray: config.stimulation.sequence.stimuli
  })
  , DSProcessor = require(`${appRoot}/src/core/dsprocessor`)
  , epochs = new DSProcessor({
    stimuli: stimuli
    , eeg: samples
    // , samplingRate: signalGlobalsDescriptor.samplingRate
  //TODO to solve problem with passing sampling rate to DSProcessor
    , channels: config.signal.channels
  })
  , EpochsProcessor = require(`${appRoot}/src/core/epprocessor`)
  , epochsProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: false
    , depth: 5
    , stimuliNumber: config.stimulation.sequence.stimuli.length
  })
  , Classifier = require(`${appRoot}/src/core/classifier`)
  , classifier = new Classifier({
    // objectMode: false//TODO clarify object mode
  })
  
  
  , mbEEGServer = Net.createServer(socket => { //5. Create and run TCP server to communicate between main process of app and renderer process of keyboard (carousel)
    console.log(`client ${socket.remoteAddress}:${socket.remotePort} connected`);
    // .pipe(verdictsSocket);
    // stimuli.pipe(socket);
    classifier.on(`data`, verdict => {
      verdict.unshift(`v`);
      socket.write(verdict);
    });
    
    socket.on(`end`, () => {
      // stimuli.unpipe();
      console.log('end: client disconnected');
    });
    socket.on(`close`, () => {
      // stimuli.unpipe();
      console.log('close: client disconnected');
    });
    socket.on(`error`, () => {
      stimuli.unpipe();
      console.log('error: client disconnected');
    });
    
  }).listen(config.service.port, config.service.host, () => {
    console.log(`1. mbEEG server listen: ${config.service.host}:${config.service.port}...`)
  })
;

openVibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));
mbEEGServer.on(`close`, () => console.log(`mbEEG sever closed.`));

// stimuli.pipe(stringifier).pipe(process.stdout);//test
// openVibeJSON.pipe(stringifier).pipe(process.stdout);
// samples.pipe(stringifier).pipe(process.stdout);
epochs.pipe(stringifier).pipe(process.stdout);
// epochsProcessor.pipe(stringifier).pipe(process.stdout);
// epochsProcessor.pipe(classifier).pipe(stringifier).pipe(process.stdout);

