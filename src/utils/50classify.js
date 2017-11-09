"use strict";

const
  Net = require('net')
  // , cli = require('commander')
  , {EBMLReader, OVReader, Stimuli, Epochs, DSVProcessor, EpochSeries, DSHProcessor, Tools, Stringifier, Classifier} = require('mbeeg')
  , stringifier = new Stringifier({chunkEnd: `\r\n`})
  , config = Tools.loadConfiguration(`config.json`)
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
  , epochs = new Epochs({
    stimuli: stimuli
    , samples: openVibeJSON.pipe(samples)
    , cycleLength: config.stimulation.sequence.stimuli.length
    , channels: config.signal.channels
    , epochDuration: config.signal.epoch.duration
  })
  , butterworth4 = new DSVProcessor({
    action: Tools.butterworth4Bulanov
  })
  , detrend = new DSVProcessor({
    action: Tools.detrend
  })
  , epochSeries = new EpochSeries({
    stimuliIdArray: config.stimulation.sequence.stimuli
    , depth: config.signal.dsp.horizontal.methods.absIntegral.depth
    , incremental: config.signal.dsp.horizontal.methods.absIntegral.incremental
  })
  , features = new DSHProcessor()
  , classifier = new Classifier({
    method: Tools.absIntegral
    , methodParameters: config.classification.methods.absIntegral
  })
;

// cli.version('0.0.1')
//   .description(`Features generator. Gets epoch flow and produces stream of features ready to classification.`)
//   .usage(`[option]`)
//   .option(`-j --json`, `Wraps features array into json.`)
//   .parse(process.argv)
// ;

// if (process.argv.length <= 2) {
//   cli.help();
//   process.exit(0);
// }

epochs
  .pipe(butterworth4)
  .pipe(detrend)
  .pipe(epochSeries)
  .pipe(features)
  .pipe(classifier)
  .pipe(stringifier)
  .pipe(process.stdout);
