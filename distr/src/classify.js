"use strict";

const
  Net = require('net')
  , cli = require('commander')
  , {EBMLReader, OVReader, Stimuli, DSProcessor, EpochsProcessor, Classifier, Stringifier, NTVerdictStringifier, Objectifier, Tools} = require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , plainStringifier = new Stringifier({
    chunkEnd: `\n\r`
  })
  , featuresStringifier = new Stringifier({
    // beginWith: `{"features":[\n\r`
    chunkBegin: `{"feature":\n\r`
    // , chunksDelimiter: `,\n\r `
    , chunkEnd: `}`
    // , endWith: `]}`
  })
  , verdictStringifier = new Stringifier({
    chunkBegin: `{"verdict":`
    , chunkEnd: `}\n\r`
  })
  , ntrainerStringifier = new NTVerdictStringifier({
    chunkBegin: `{\n"class": "ru.itu.parcus.modules.neurotrainer.modules.mberpxchg.dto.MbeegEventClassifierResult",
    "cells": [`
    , chunkEnd: `]}\n`
    , chunksDelimiter: `,`
    , indentationSpace: 2
    , stringifyAll: true
    , fields: [
      {
        name: "class",
        type: "literal",
        content: "ru.itu.parcus.modules.neurotrainer.modules.mberpxchg.dto.MbeegCellWeight"
      },
      {name: "cellId", type: "id"},
      {name: "weight", type: "value"}]
  })
  , epochsObjectifier = new Objectifier()
  , openVibeClient = new Net.Socket() //3. Create TCP client for openViBE eeg data server
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
  , openVibeJSON = new EBMLReader({
    ebmlSource: openVibeClient.connect(config.signal.port, config.signal.host, () => {})
    , ebmlCallback: provideTCP
  })
  , samples = new OVReader({
    ovStream: openVibeJSON
  })
  , stimuli = new Stimuli({ //should pipe simultaneously to the dsprocessor and to the carousel
    signalDuration: config.stimulation.duration
    , pauseDuration: config.stimulation.pause
    , stimuliArray: config.stimulation.sequence.stimuli
  })
  , epochs = new DSProcessor({
    stimuli: stimuli
    , samples: samples
    // , cyclesLimit: 1
    // , samplingRate: signalGlobalsDescriptor.samplingRate
    //TODO solve problem with passing sampling rate to DSProcessor
    , channels: config.signal.channels
    , processingSteps: config.signal.dspsteps
  })
  // , EpochsProcessor = require(`${appRoot}/src/core/epprocessor`)
  , featuresProcessor = new EpochsProcessor({
    epochs: epochs
    , moving: false
    , depth: 5
    , stimuliNumber: config.stimulation.sequence.stimuli.length
  })
  , classifier = new Classifier({})

;

cli.version('0.0.1')
  .description(`Gets features flow and produces stream of verdicts with weights of each stimulus that characterizes the probability of choice.`)
  .usage(`[option]`)
  .option(`-p --pipe`, `Gets epochs flow from stdin through pipe`)
  .option(`-i --internal`, `Gets epochs flow from source defined in config.json file`)
  .option(`-j --json`, `Wraps features array into json.`)
  .option(`-n, --neurotrainer`, `Outputs wrapped into Neuro Trainer specific json`)
  .parse(process.argv)
;

if (process.argv.length <= 2) {
  cli.help();
  return;
}

if (cli.pipe) {
  process.stdin.pipe(epochsObjectifier);
  if (cli.json) epochsObjectifier.pipe(classifier).pipe(verdictStringifier).pipe(process.stdout);
  else if (cli.neurotrainer) epochsObjectifier.pipe(classifier).pipe(ntrainerStringifier).pipe(process.stdout);
  else epochsObjectifier.pipe(classifier).pipe(plainStringifier).pipe(process.stdout);
} else if (cli.internal) {
  if (cli.json) featuresProcessor.pipe(classifier).pipe(verdictStringifier).pipe(process.stdout);
  else if (cli.neurotrainer) featuresProcessor.pipe(classifier).pipe(ntrainerStringifier).pipe(process.stdout);
  else featuresProcessor.pipe(classifier).pipe(plainStringifier).pipe(process.stdout);
} else {
  cli.help();
  return;
}
