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
;

Client.on('close', () => { console.log('Connection closed'); });

const ebmlReader = new EBMLReader({
  ebmlSource: Client.connect(1024, 'localhost', () => { }),
  ebmlCallback: provideTCP,
  objectMode: true
});
const ovReader = new OVReader({ovStream: ebmlReader, objectMode: false});
ovReader.pipe(process.stdout);

