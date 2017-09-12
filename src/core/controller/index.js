"use strict";
const
  appRoot = require(`app-root-path`)
  , Client = require('net').Socket()
  , EBMLReader = require(`${appRoot}/src/tools/ebml/reader`)
  , OVReader = require(`${appRoot}/src/tools/openvibe/reader`)
  , provideTCP = (context, data) => {
    let start = 0;//start of next chunk in data
    
    if (!context.expectedEBMLChunkSize) {//first or new, after previous completion, openViBE chunk received by tcp client
      context.ebmlChunk = Buffer.alloc(0);
      context.expectedEBMLChunkSize = 0;
      //first we should get tcp chunk size (ebmlChunkSize) and then write to ebmlChunk tcp data of that size
      //1.Get tcp data
      // console.log('tcp data:');
      // console.log(data);
      //2.read openViBE ebml chunk length
      context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
      //3.get pure ov ebml chunk data
      data = data.slice(8);//trim openViBE specific TCP header, so now ebmlChunk is pure EBML data
    }
    let actualSizeOfTCPData = data.length;//actualSize of ebml data presented in current tcp data chunk
    
    // console.log('========================================================');
    // console.log(`Expected chunk size - ${context.expectedEBMLChunkSize}; actual raw data size without header - ${actualSizeOfTCPData} `);
    // console.log('raw data:');
    // console.log(data);
    
    if (actualSizeOfTCPData && context.expectedEBMLChunkSize) {//if ebml data present and ebml chunk size from openViBE tcp pack header present too
      while (actualSizeOfTCPData > context.expectedEBMLChunkSize) {
        context.ebmlChunk = Buffer.from(data, start, context.expectedEBMLChunkSize);
        // console.log('........................................................');
        // console.log(`extracted ebml chunk data size: ${context.ebmlChunk.length}`);
        // console.log(`extracted ebml chunk data:`);
        // console.log(context.ebmlChunk);
        // console.log('========================================================');
        context.write(context.ebmlChunk);
        start += context.expectedEBMLChunkSize;
        context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
      }
      if (actualSizeOfTCPData <= context.expectedEBMLChunkSize) {//actual chunk length is less then required as prescribed in ov tcp pack header (due some network problems e.g.)
        context.expectedEBMLChunkSize -= actualSizeOfTCPData;//decrease size of expected but not received ebml data by amount of received data
        context.ebmlChunk = Buffer.concat([context.ebmlChunk, data]);//assemble chunk to the full ebmlChunkSize before write ebmlChunk into ebml reader
        // console.log('........................................................');
        // console.log(`assembled ebml chunk data size: ${context.ebmlChunk.length}`);
        // console.log(`assembled ebml chunk data:`);
        // console.log(context.ebmlChunk);
        // console.log('========================================================');
        if (!context.expectedEBMLChunkSize) {
          // reader.write(context.ebmlChunk);
          context.write(context.ebmlChunk);
          context.ebmlChunk = Buffer.alloc(0);
        }
      }
    }
  }
  , eegCSV = require(`csv-streamify`)({objectMode: true})
  , EEG = require(`${appRoot}/src/core/dsprocessor/eeg.js`)
  , stimuliCSV = require(`csv-streamify`)({
    // objectMode: false
    objectMode: true
  })
  , Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`)
  , DSProcessor = require(`${appRoot}/src/core/dsprocessor`)
  , EpochsProcessor = require(`${appRoot}/src/core/epprocessor`)
  , Classifier = require(`${appRoot}/src/core/classifier`)
  // , Helpers = require(`${appRoot}/src/tools/helpers`)
  , fs = require(`fs`)
;
//EBML
//11111111111111111111111111
/*
Client.on('close', () => {
  console.log('Connection closed');
})
// .pipe(process.stdout)
;
//22222222222222222222222222
const ebmlReader = new EBMLReader({
    ebmlSource: Client.connect(1024, '127.0.0.1', () => {
    })
    , ebmlCallback: provideTCP
    // , objectMode: false
    , objectMode: true
  })
  // .pipe(process.stdout)
;
//333333333333333333333333333
const ovReader = new OVReader({
    ovStream: ebmlReader
    , objectMode: false
    // , objectMode: true
  })
  // .pipe(process.stdout)
;
*/

let stimuli = new Stimuli({
  // stringify: true
  // , signalDuration: 120
  // , pauseDuration: 230
  // objectMode: false
  objectMode: true
});

let eeg = new EEG({
  // stringify: true,
  // samplingRate: 250,
  objectMode: true
});

const epochs = new DSProcessor({
    stimuli:
      fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/stimuli45.csv`)
        .pipe(stimuliCSV)
        .pipe(stimuli),
    // eeg: ovReader,
    eeg:
    fs.createReadStream(`${appRoot}/test/dsprocessor/data/integral/eeg45.csv`)
      .pipe(eegCSV)
      .pipe(eeg),
    learning: false,
    stimuliNumber: 4,
    epochDuration: 1000,
    samplingRate: 250,
    sequence: `filter, detrend`,
    objectMode: false
    // objectMode: true
    
  })
    .pipe(process.stdout)
;
/*

const classifier = new Classifier({
  // method: lib.absIntegral,
  objectMode: true
});

const epochProcessor = new EpochsProcessor({
    epochs: epochs,
    moving: false,
    depth: 5,
    stimuliNumber: 4,
    objectMode: false
  })
    // .pipe(classifier)
    // .on(`data`, classification => console.log(classification.reduce((ac, v, i, ar) => ar[ac] < v ? ac = i : ac, 0)))
  // .pipe(process.stdout)
;
*/

/*class Controller {
  constructor({
                stimuli, eeg,
                learning = false
              }) {
    this.eeg = new EEG({
      // stringify: true,
      // samplingRate: 250,
      objectMode: true
    });
    
    this.stimuli = new Stimuli({
      // stringify: true,
      // signalDuration: 120,
      // pauseDuration: 230,
      objectMode: true
    });
    
    if (learning) {
      //preparing data for learning according to learning policy from file learning.json
      // first - save raw epochs data with targets (see
      // second - vary preprocessing parameters as it prescribed in learning.json file
      // third - write resulting stream to _transform callback writable
      // this.learning = JSON.parse(fs.readFileSync(`../learning.json`));
    } else {//online mode - recognizing and classification
      const epochs = new DSProcessor({
        stimuli, eeg,
        learning: false,
        stimuliNumber: 4,
        epochDuration: 1000,
        samplingRate: 250,
        sequence: `filter, detrend`,
        objectMode: true //set false to output result as string (through process.stdout e.g.); set true to pass js objects
      });
      
      const epochProcessor = new EpochsProcessor({
        epochs,
        moving: false,
        depth: 5,
        stimuliNumber: 4,
        objectMode: true
      });
      
      const classifier = new Classifier({
          objectMode: false
        })
      ;
      
      epochProcessor
        .pipe(classifier)
    }
    
  }
  
  run({learning = false}) {
    this.dsprocessor = new DSProcessor({stimuli, eeg, learning: true});
    this.classifier = new Classifier({});
  }
  
}

module.exports = Controller;*/
