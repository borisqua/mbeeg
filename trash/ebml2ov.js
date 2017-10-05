"use strict";
const
  Net = require('net')
  , cli = require('commander')
  , {EBMLReader, Stringifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , ovStringifier = new Stringifier({
    beginWith: `{\r\n`
    , chunkBegin: `"openViBE_Stream":`
    , chunksDelimiter: `, `
    , chunkEnd: `}`
    , endWith: `}`
    , indentationSpace: 2
  })
  , tcpFeeder = (context, tcpchunk) => {
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
      else if(!context.expectedEBMLChunkSize)
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
  , provideTCP = (context, data) => {
    let start = 0;//start of next chunk in data
    try {
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
          context.ebmlChunk = Buffer.from(data.slice(start, start + context.expectedEBMLChunkSize));
          context.write(context.ebmlChunk);
          context.ebmlChunk = Buffer.alloc(0);
          start += context.expectedEBMLChunkSize;
          actualSizeOfTCPData -= context.expectedEBMLChunkSize;
          
          context.expectedEBMLChunkSize = data.readUIntLE(start, 8);//first Uint64LE contains length of ebml data sent by openViBE
          start += 8;
          actualSizeOfTCPData -= 8;
        }
        if (actualSizeOfTCPData <= context.expectedEBMLChunkSize) {//actual chunk length is less then required as prescribed in ov tcp pack header (due some network problems e.g.) amount of received data
          context.ebmlChunk = Buffer.concat([context.ebmlChunk, data.slice(start, start+context.expectedEBMLChunkSize)]);//assemble chunk to the full ebmlChunkSize before write ebmlChunk into ebml reader
          context.expectedEBMLChunkSize -= actualSizeOfTCPData;//decrease size of expected but not received ebml data by
          if (!context.expectedEBMLChunkSize) {
            context.write(context.ebmlChunk);
            context.ebmlChunk = Buffer.alloc(0);
          }
        }
      }
    } catch (err) {
      debugger;
      console.log(err.message);
      err.throw();
    }
  }
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    , ebmlCallback: tcpFeeder
  })
;

openVibeClient.on('close', () => console.log(`\r\n...\r\nOpen ViBE connection closed`));
openVibeJSON.pipe(ovStringifier).pipe(process.stdout);

cli.version('0.0.1')
  .description(`openViBE json stream parser. Gets json ovStream from stdin and puts samples into stdout.`);