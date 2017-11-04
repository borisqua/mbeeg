"use strict";
const
  Net = require('net')
  , cli = require('commander')
  , {EBMLReader, OVReader, Epochs, DSVProcessor, Stimuli, Stringifier, Objectifier, Tools, Channels} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , epochsStringifier = new Stringifier({
    beginWith: `{"epochs": [\n`
    , chunkBegin: ``
    , chunksDelimiter: `,`
    , chunkEnd: `\r\n`
    , endWith: `]}`
    , indentationSpace: 2
  })
  , stimuliObjectifier = new Objectifier()
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
  , tcp2ebmlFeeder = (context, tcpchunk) => {
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
    , ebmlCallback: tcp2ebmlFeeder
  })
  , samples = new OVReader()
  , stimuli = new Stimuli({ //should pipe simultaneously to the epochs and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliIdArray: config.stimulation.sequence.stimuli
  })
  , channelsMonitor = new Channels({
    // keys: [20],
    // channels: [1] //, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  })
  , butterworth4 = new DSProcessor({
    action: Tools.butterworth4Bulanov
    , actionParameters: config.signal.dsp.vertical.methods.butterworth4Bulanov
  })
  , detrend = new DSProcessor({
    action: Tools.detrend
    , actionParameters: config.signal.dsp.vertical.methods.detrend
  })
;
let epochs = {};

cli.version('0.0.1')
  .description(`Epochs generator. Gets stimuli & samples flows and produces stream of json epoch objects.`)
  .usage(`<option>`)
  .option(`-c, --channels`, `Outputs activity by channels`)
  // .option(`-e --epochs`, `Outputs json epoch-objects`)
  // .option(`-p --pipe`, `Gets stimuli flow from stdin through pipe`)
  .parse(process.argv)
;

if (cli.pipe) {
  process.stdin.pipe(stimuliObjectifier);
  epochs = new Epochs({
    stimuli: stimuliObjectifier
    , samples: openVibeJSON.pipe(samples)
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  });
} else {
  epochs = new Epochs({
    stimuli: stimuli
    , samples: openVibeJSON.pipe(samples)
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
    , processingSequence: config.signal.dsp.vertical.steps
    , cyclesLimit: config.signal.cycles
  });
}

// if (process.argv.length <= 2) cli.help();
if (cli.channels)
  epochs.pipe(butterworth4).pipe(detrend).pipe(channelsMonitor).pipe(process.stdout);
else
  epochs.pipe(butterworth4).pipe(detrend).pipe(epochsStringifier).pipe(process.stdout);
