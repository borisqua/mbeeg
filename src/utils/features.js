"use strict";

const
  Net = require('net')
  , cli = require('commander')
  , {EBMLReader, OVReader, Stimuli, DSProcessor, EpochsProcessor, Stringifier, Objectifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , plainStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , featuresStringifier = new Stringifier({
    // beginWith: `{"features":[\r\n`
    chunkBegin: `{"feature":\r\n`
    , chunksDelimiter: `,\r\n `
    , chunkEnd: `}\r\n`
    // , endWith: `]}`
    , indentationSpace: 2
    , stringifyAll: true
  })
  , epochsObjectifier = new Objectifier()
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
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
  , samples = new OVReader({})
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliArray: config.stimulation.sequence.stimuli
  })
  , epochs = new DSProcessor({
    stimuli: stimuli
    , samples: openVibeJSON.pipe(samples)
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  })
;
let featuresProcessor = {};

cli.version('0.0.1')
  .description(`Features generator. Gets epoch flow and produces stream of features ready to classification.`)
  .usage(`[option]`)
  .option(`-p --pipe`, `Gets epochs flow from stdin through pipe`)
  .option(`-i --internal`, `Gets epochs flow from source defined in config.json file`)
  .option(`-j --json`, `Wraps features array into json.`)
  .parse(process.argv)
;

if (process.argv.length <= 2) {
  cli.help();
  return;
}

if (cli.pipe) {
  process.stdin.pipe(epochsObjectifier);
  featuresProcessor = new EpochsProcessor({
    epochs: epochsObjectifier
    , moving: config.signal.dsp.horizontal.moving //true means moving calculation in to depth as specified
    , depth: config.signal.dsp.horizontal.depth //0 means full depth
    , stimuliNumber: config.stimulation.sequence.stimuli.length
  });
  if (cli.json) featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
  else featuresProcessor.pipe(plainStringifier).pipe(process.stdout);
} else if (cli.internal) {
  featuresProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: config.signal.dsp.horizontal.moving //true means moving calculation in to depth as specified
    , depth: config.signal.dsp.horizontal.depth //0 means full depth
    , stimuliNumber: config.stimulation.sequence.stimuli.length
  });
  if (cli.json) featuresProcessor.pipe(featuresStringifier).pipe(process.stdout);
  else featuresProcessor.pipe(plainStringifier).pipe(process.stdout);
} else {
  cli.help();
  return;
}
