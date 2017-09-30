"use strict";

const
  appRoot = require('app-root-path')
  , Net = require('net')
  , cli = require('commander')
  , {Stringifier, Objectifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , plainStringifier = new Stringifier({
    chunkEnd: `\n\r`
  })
  , epochsStringifier = new Stringifier({
    beginWith: `{"epochs": [\n`
    , chunkBegin: `\n\r`
    , chunksDelimiter: `,`
    , chunkEnd: `\n\r`
    , endWith: `]}`
    // , indentationSpace: 2
  })
  , stimuliObjectifier = new Objectifier()
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
  , EBMLReader = require('C:/Users/Boris/YandexDisk/localhost.chrome/src/tools/ebml/reader') //parse from ebml to json//Use in node mode
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    , ebmlCallback: provideTCP
  })
  , OVReader = require('C:/Users/Boris/YandexDisk/localhost.chrome/src/tools/openvibe/reader') //extract samples from openViBE stream
  , samples = new OVReader({
    ovStream: openVibeJSON
    // , signalDescriptor: signalGlobalsDescriptor
  })
  // , Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`) //2. Create stimuli provider for keyboard(carousel) and eeg/P300 classifier
  , Stimuli = require('C:/Users/Boris/YandexDisk/localhost.chrome/src/core/dsprocessor/stimuli.js') //2. Create stimuli provider for keyboard(carousel) and eeg/P300 classifier
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliArray: config.stimulation.sequence.stimuli
  })
  , DSProcessor = require('C:/Users/Boris/YandexDisk/localhost.chrome/src/core/dsprocessor')
  , {Channels} = require('C:/Users/Boris/YandexDisk/localhost.chrome/test/testhelpers')
  , channelsMonitor = new Channels({
    // keys: [20],
    // channels: [1] //, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  })
;
let epochs = {};

cli.version('0.0.1')
  .description(`Epochs generator. Gets stimuli & samples flows and produces stream of json epoch objects.`)
  .usage(`<option>`)
  .option(`-c, --channels`, `Outputs activity by channels`)
  .option(`-e --epochs`, `Outputs json epoch-objects`)
  // .option(`-p --pipe`, `Gets stimuli flow from stdin through pipe`)
  .parse(process.argv)
;

if (cli.pipe) {
  process.stdin.pipe(stimuliObjectifier);
  epochs = new DSProcessor({
    stimuli: stimuliObjectifier
    , samples: samples
    // , cyclesLimit: 1
    // , samplingRate: signalGlobalsDescriptor.samplingRate
    //TODO solve problem with passing sampling rate to DSProcessor
    , channels: config.signal.channels
    , processingSteps: config.signal.dspsteps
  })
  ;
} else {
  epochs = new DSProcessor({
    stimuli: stimuli
    , samples: samples
    // , cyclesLimit: 1
    // , samplingRate: signalGlobalsDescriptor.samplingRate
    //TODO solve problem with passing sampling rate to DSProcessor
    , channels: config.signal.channels
    , processingSteps: config.signal.dspsteps
  })
  ;
}

if (process.argv.length <= 2) cli.help();
if (cli.channels) epochs.pipe(channelsMonitor).pipe(process.stdout);
if (cli.epochs) epochs.pipe(epochsStringifier).pipe(process.stdout);

