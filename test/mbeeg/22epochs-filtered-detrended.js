"use strict";
const
  Net = require('net')
  , {EBMLReader, OVReader, Epochs, DSVProcessor, Stimuli, Stringifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`../../config.json`)
  , epochsStringifier = new Stringifier({
    beginWith: `{"epochs": [\n`
    , chunkBegin: ``
    , chunksDelimiter: `,`
    , chunkEnd: `\r\n`
    , endWith: `]}`
    , indentationSpace: 2
  })
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
    ebmlSource: openVibeClient.connect(config.mbeeg.signal.port, config.mbeeg.signal.host, () => {})
    , ebmlCallback: tcp2ebmlFeeder
  })
  , samples = new OVReader()
  , stimuli = new Stimuli({ //should pipe simultaneously to the epochs and to the carousel
    duration: config.mbeeg.stimulation.duration
    , pause: config.mbeeg.stimulation.pause
    , stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli
  })
  , butterworth4 = new DSVProcessor({
    method: Tools.butterworth4Bulanov
    , parameters: config.mbeeg.signal.dsp.vertical.methods.butterworth4Bulanov
  })
  , detrend = new DSVProcessor({
    method: Tools.detrend
    , parameters: config.mbeeg.signal.dsp.vertical.methods.detrend
  })
;

let epochs = new Epochs({
    stimuli: stimuli
    , samples: openVibeJSON.pipe(samples)
    , channels: config.mbeeg.signal.channels
    , epochDuration: config.mbeeg.signal.epoch.duration
    , processingSequence: config.mbeeg.signal.dsp.vertical.steps
    , cyclesLimit: config.mbeeg.signal.cycles
  })
;

epochs.pipe(butterworth4).pipe(detrend).pipe(epochsStringifier).pipe(process.stdout);

