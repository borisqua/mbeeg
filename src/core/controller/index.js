"use strict";
const
  appRoot = require(`app-root-path`)
  , Net = require('net')
  , {Transform, PassThrough} = require(`stream`)
  , Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`)
  , EBMLReader = require(`${appRoot}/src/tools/ebml/reader`)
  , OVReader = require(`${appRoot}/src/tools/openvibe/reader`)
  , provideTCP = (context, data) => {
    let start = 0;//start of next chunk in data
    
    if (!context.expectedEBMLChunkSize) {//first or new, after previous completion, openViBE chunk received by tcp client
      context.ebmlChunk = Buffer.alloc(0);
      context.expectedEBMLChunkSize = 0;
      context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
      data = data.slice(8);//trim openViBE specific TCP header, so now ebmlChunk is pure EBML data
    }
    let actualSizeOfTCPData = data.length;//actualSize of ebml data presented in current tcp data chunk
    
    if (actualSizeOfTCPData && context.expectedEBMLChunkSize) {//if ebml data present and ebml chunk size from openViBE tcp pack header present too
      while (actualSizeOfTCPData > context.expectedEBMLChunkSize) {
        context.ebmlChunk = Buffer.from(data, start, context.expectedEBMLChunkSize);
        context.write(context.ebmlChunk);
        start += context.expectedEBMLChunkSize;
        context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
      }
      if (actualSizeOfTCPData <= context.expectedEBMLChunkSize) {//actual chunk length is less then required as prescribed in ov tcp pack header (due some network problems e.g.)
        context.expectedEBMLChunkSize -= actualSizeOfTCPData;//decrease size of expected but not received ebml data by amount of received data
        context.ebmlChunk = Buffer.concat([context.ebmlChunk, data]);//assemble chunk to the full ebmlChunkSize before write ebmlChunk into ebml reader
        if (!context.expectedEBMLChunkSize) {
          // reader.write(context.ebmlChunk);
          context.write(context.ebmlChunk);
          context.ebmlChunk = Buffer.alloc(0);
        }
      }
    }
  }
  , DSProcessor = require(`${appRoot}/src/core/dsprocessor`)
  , EpochsProcessor = require(`${appRoot}/src/core/epprocessor`)
  , Classifier = require(`${appRoot}/src/core/classifier`)
  , config = require(`${appRoot}/config`) //json with configuration data
;

//1. Load configuration - config.json file with stimuli, dsp and carousel parameters
//2. Create and run IPC server to communicate between main process of app and renderer process of keyboard (carousel)
const ipcServer = Net.createServer(connection => {
  connection.on('connect', () => console.log(`client connected`));
  connection.on(`disconnect`, () => console.log(`client disconnected`));
});
ipcServer.on(`close`, () => console.log(`client disconnected`));
ipcServer.listen(`\\\\?\\pipe\\ipcController`, () => {
  process.send(`ipc-controller-listen`);
});

//3. Create TCP client for openViBE eeg data provider TCP server
const openvibeClient = Net.Socket();
openvibeClient.on(`close`, () => console.log(`Open ViBE connection closed`));

//4. Create openViBE parser
const ovReader = new OVReader({
  ovStream: new EBMLReader({
    ebmlSource: openvibeClient.connect(config.eeg.port, config.eeg.host, () => {
      console.log(`openViBE connection established`)
    }),
    ebmlCallback: provideTCP
  })
});

//5. Create stimuli provider for keyboard(carousel) and eeg/P300 classifier
const
  stimuli = new Stimuli.Readable({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration,
    pauseDuration: config.stimulation.pause,
    stimuliArray: config.stimulation.sequence.stimuli
  }),
  caster = new Transform({
    objectMode: true,
    transform(stimulus, encoding, cb) {
      process.send(`stimulus sent`);
      cb(null, stimulus);
    }
  }),
  pass = new PassThrough
;
// stimuli.pipe(caster);
stimuli.pipe(pass);
// stimuli.pause();

process.on(`message`, message => {
  switch (message) {
    case `start-stimuli`:
      console.log(`start stimuli`);
      break;
    case `stop-stimuli`:
      console.log(`stop stimuli`);
      break;
    case `start-classification`:
      console.log(`start p300`);
      break;
    case `stop-classification`:
      console.log(`stop p300`);
      break;
    default:
  }
});
// process.send({id: 0, text: `hello electron`});