"use strict";
const
  Net = require('net')
  , cli = require('commander')
  , {EBMLReader, Stringifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , ovStringifier = new Stringifier({
    beginWith: `{\n\r`
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
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    , ebmlCallback: tcpFeeder
  })
;

openVibeClient.on('close', () => console.log(`\n\r...\n\rOpen ViBE connection closed`));
openVibeJSON.pipe(ovStringifier).pipe(process.stdout);

cli.version('0.0.1')
  .description(`openViBE json stream parser. Gets json ovStream from stdin and puts samples into stdout.`);