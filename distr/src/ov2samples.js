"use strict";
const
  Net = require('net')
  , {EBMLReader, OVReader, Stringifier, Objectifier, Tools} = require('mbeeg')
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , config = Tools.loadConfiguration(`config.json`)
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
    , ebmlCallback: tcpFeeder
  })
  , objectifier = new Objectifier()
  , plainStringifier = new Stringifier({
    chunkEnd: `\n\r`
  })
  , sampleStringifier = new Stringifier({
    chunkBegin: `{"sample":`
    , chunkEnd: `}\n\r`
  })
  , cli = require('commander')
;
let samples = {};

cli.version('0.0.1')
  .description(`openViBE json stream parser. Gets json ovStream and puts samples into stdout.`)
  .usage(`<option>`)
  .option(`-p, --pipe`, `Get ovStream from stdin through pipe`)
  .option(`-j, --json`, `Outputs json wrapped vectors`)
  .parse(process.argv)
;

// if (process.argv.length <= 2) cli.help();

if (cli.pipe) {
  process.stdin.pipe(objectifier);
  samples = new OVReader({
    ovStream: objectifier
  });
  if (cli.json)
    samples.pipe(sampleStringifier).pipe(process.stdout);
  else
    samples.pipe(plainStringifier).pipe(process.stdout);
} else {
  samples = new OVReader({
    ovStream: openVibeJSON
  });
  if (cli.json)
    samples.pipe(sampleStringifier).pipe(process.stdout);
  else
    samples.pipe(plainStringifier).pipe(process.stdout);
}


// samples.pipe(sampleStringifier).pipe(process.stdout);
