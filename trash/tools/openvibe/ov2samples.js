"use strict";
const
  Net = require('net')
  , {Stringifier, Objectifier, Tools} = require('mbeeg')
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , config = Tools.loadConfiguration(`config.json`)
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
  // , config = Tools.loadConfiguration(`config.json`)
  , OVReader = require('C:/Users/Boris/YandexDisk/localhost.chrome/src/tools/openvibe/reader') //extract samples from openViBE stream
  // , OVReader = require(`${appRoot}/src/tools/openvibe/reader`) //extract samples from openViBE stream
  , objectifier = new Objectifier()
  , plainStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , sampleStringifier = new Stringifier({
    chunkBegin: `{"sample":`
    , chunkEnd: `}\r\n`
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
  if (cli.json) samples.pipe(sampleStringifier).pipe(process.stdout);
  else samples.pipe(plainStringifier).pipe(process.stdout);
} else {
  samples = new OVReader({
    ovStream: openVibeJSON
  });
  if (cli.json) samples.pipe(sampleStringifier).pipe(process.stdout);
  else samples.pipe(plainStringifier).pipe(process.stdout);
}


// samples.pipe(sampleStringifier).pipe(process.stdout);
