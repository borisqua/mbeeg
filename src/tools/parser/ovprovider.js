"use strict";

const
  appRoot = require(`app-root-path`),
  fs = require(`fs`),
  Client = require('net').Socket(),
  // Tools = require(`${appRoot}/src/tools/helpers`),
  Reader = require(`${appRoot}/src/tools/parser/ebml/reader`),
  reader = new Reader({}),
  provideTCP = (data) => {
    let start = 0;//start of chunk in data
    if (!expectedEBMLChunkSize) {//first or new, after previous completion, openViBE chunk received by tcp client
      //first we should get tcp chunk size (ebmlChunkSize) and then write to ebmlChunk tcp data of that size
      //1.Get tcp data
      console.log('tcp data:');
      console.log(data);
      //2.read openViBE ebml chunk length
      expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
      //3.get pure ov ebml chunk data
      data = data.slice(8);//trim openViBE specific TCP header, so now ebmlChunk is pure EBML data
    }
    let actualSizeOfTCPData = data.length;//actualSize of ebml data presented in current tcp data chunk
    
    console.log('========================================================');
    console.log(`Expected chunk size - ${expectedEBMLChunkSize}; actual raw data size without header - ${actualSizeOfTCPData} `);
    console.log('raw data:');
    console.log(data);
    
    if (actualSizeOfTCPData && expectedEBMLChunkSize) {//if ebml data present and ebml chunk size from openViBE tcp pack header present too
      while (actualSizeOfTCPData > expectedEBMLChunkSize) {
        ebmlChunk = Buffer.from(data, start, expectedEBMLChunkSize);
        console.log('........................................................');
        console.log(`extracted ebml chunk data size: ${ebmlChunk.length}`);
        console.log(`extracted ebml chunk data:`);
        console.log(ebmlChunk);
        console.log('========================================================');
        reader.write(ebmlChunk);
        start += expectedEBMLChunkSize;
        expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
      }
      if (actualSizeOfTCPData <= expectedEBMLChunkSize) {//actual chunk length is less then required as prescribed in ov tcp pack header (due some network problems e.g.)
        expectedEBMLChunkSize -= actualSizeOfTCPData;//decrease size of expected but not received ebml data by amount of received data
        ebmlChunk = Buffer.concat([ebmlChunk, data]);//assemble chunk to the full ebmlChunkSize before write ebmlChunk into ebml reader
        console.log('........................................................');
        console.log(`assembled ebml chunk data size: ${ebmlChunk.length}`);
        console.log(`assembled ebml chunk data:`);
        console.log(ebmlChunk);
        console.log('========================================================');
        if (!expectedEBMLChunkSize) {
          reader.write(ebmlChunk);
          ebmlChunk = Buffer.alloc(0);
        }
      }
    }
  },
  provideFile = (data) => {
    // ebmlChunk = Buffer.concat([ebmlChunk, data]);
    // reader.write(ebmlChunk);
    reader.write(data);
    // ebmlChunk = Buffer.alloc(0);
  };

let ebmlChunk = Buffer.alloc(0);
let expectedEBMLChunkSize = 0;

// Client.connect(1024, '127.0.0.1', () => {
//   console.log('Connected');
// });
// Client.on(`data`, provideTCP);
// Client.on('close', () => {
//   console.log('Connection closed');
// });

fs.createReadStream(`./ebml/data/bci-ssvep-training.ov`)
// fs.createReadStream(`./ebml/data/tcp_raw01.bin`)
// fs.createReadStream(`./ebml/data/test.webm`)
// .on(`data`, data => console.log(data));
  .on(`data`, provideFile);
