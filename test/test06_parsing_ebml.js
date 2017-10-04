"use strict";
const
  Client = require('net').Socket()
  , {EBMLReader, OVReader} = require('mbeeg')
  , provideTCP = (context, data) => {
    //1.Get tcp data
    context.tcpbuffer = Buffer.concat([context.tcpbuffer, data]);
    let bufferTailLength = context.tcpbuffer.length - context.tcpcursor;
    while (bufferTailLength >= context.expectedEBMLChunkSize) {
      context.expectedEBMLChunkSize = context.tcpbuffer.readUIntLE(context.tcpcursor, 8);//first Uint64LE contains length of ebml data sent by openViBE
      context.tcpcursor += 8;
      bufferTailLength -= 8;
      if (bufferTailLength <= context.expectedEBMLChunkSize) {
        context.expectedEBMLChunkSize -= bufferTailLength;//decrease size of expected but not received ebml data by amount of received data
        let bufferTail = context.tcpbuffer.slice(context.tcpcursor);
        context.ebmlChunk = Buffer.concat([context.ebmlChunk, bufferTail]);//assemble chunk to the full ebmlChunkSize before write ebmlChunk into ebml reader
        context.tcpcursor += bufferTail.length;
        bufferTailLength -= bufferTail.length;
        if (!context.expectedEBMLChunkSize)
          context.write(context.ebmlChunk);
      } else {
        context.ebmlChunk = context.tcpbuffer.slice(context.tcpcursor, context.tcpcursor + context.expectedEBMLChunkSize);
        context.tcpcursor += context.expectedEBMLChunkSize;
        context.write(context.ebmlChunk);
      }
    }
    
    /*      if (actualSizeOfTCPData && context.expectedEBMLChunkSize) {//if ebml data present and ebml chunk size from openViBE tcp pack header present too
            while (actualSizeOfTCPData > context.expectedEBMLChunkSize) {
              context.ebmlChunk = context.tcpbuffer.slice(context.tcpcursor, context.expectedEBMLChunkSize);
              context.tcpcursor += context.expectedEBMLChunkSize;
              context.expectedEBMLChunkSize = context.tcpbuffer.readUIntLE(context.tcpcursor, 8);//first Uint64LE contains length of ebml data sent by openViBE
              context.tcpcursor += 8;
              console.log('........................................................');
              console.log(`extracted ebml chunk data size: ${context.ebmlChunk.length}`);
              console.log(`extracted ebml chunk data:`);
              console.log(context.ebmlChunk);
              console.log('========================================================');
              context.write(context.ebmlChunk);
            }
            if (actualSizeOfTCPData <= context.expectedEBMLChunkSize) {//actual chunk length is less then required as prescribed in ov tcp pack header (due some network problems e.g.)
              context.tcpcursor += 8;
              context.expectedEBMLChunkSize -= actualSizeOfTCPData;//decrease size of expected but not received ebml data by amount of received data
              context.ebmlChunk = Buffer.concat([context.ebmlChunk, data.slice(context.tcpcursor, context.expectedEBMLChunkSize)]);//assemble chunk to the full ebmlChunkSize before write ebmlChunk into ebml reader
              console.log('........................................................');
              console.log(`assembled ebml chunk data size: ${context.ebmlChunk.length}`);
              console.log(`assembled ebml chunk data:`);
              console.log(context.ebmlChunk);
              console.log('========================================================');
              if (!context.expectedEBMLChunkSize) {
                // reader.write(context.ebmlChunk);
                context.write(context.ebmlChunk);
                context.ebmlChunk = Buffer.alloc(0);
              }
            }
          }*/
  }
;

Client.on('close', () => {
  console.log('Connection closed');
});

const ebmlReader = new EBMLReader({
  ebmlSource: Client.connect(1024, '127.0.0.1', () => { }),
  ebmlCallback: provideTCP,
  objectMode: false
});
ebmlReader.pipe(process.stdout);

