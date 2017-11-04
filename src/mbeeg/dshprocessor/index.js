"use strict";

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class DSHProcessor extends require('stream').Transform {
  constructor({
                epochs,
                stimuliIdArray = [],
                depth = 1,
                moving = true,
                movingStep = 1,
                maximumCycleCount = 15,
                // learning = false,
                // sequence = `avg, detrend`,
                objectMode = true
              }) {
    super({objectMode: true});
    this.epochs = epochs;
    this.epochInWork = 0;
    this.stimuliIdArray = stimuliIdArray.slice();
    this.depth = depth;
    this.moving = moving;
    this.movingStep = movingStep;
    this.stimuliFlows = []; //array[key_id][channel][samples][sample] of sample-vectors indexed by stimuli ids. Vectors arranged by channels. Vectors are here to reduce noise by signal averaging
    this.objectMode = objectMode;
    this.cycle = 1;
    this.maximumCycleCount = maximumCycleCount;
  }
  
  reset(stimuliIdArray) {
    this.stimuliIdArray = stimuliIdArray;
    this.stimuliFlows = [];
    this.cycle = 1;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(cycle, encoding, cb) {
    console.log(`--DEBUG::        EpochProcessor::NextFeatureReady--`);
    // console.log(JSON.stringify(cycle, null, 2));
    let cycleAvgEpochs;
    if (this.depth)
      cycleAvgEpochs = cycle.map(key => key.map(ch => ch.map(samples => samples.reduce((a, b) => a + b) / this.depth)));//avg epoch
    else {
      cycleAvgEpochs = cycle.map(key => key.map(ch => ch.map(samples => samples.reduce((a, b) => a + b) / this.cycle)));//avg epoch
      if (cycle[0]) console.log(`cycle depth: ${cycle[0][0][0].length}; cycle: ${this.cycle}`);
    }
    if (this.objectMode)
      cb(null, cycleAvgEpochs);
    else
      cb(null, JSON.stringify(cycleAvgEpochs, null, 2));
  }
  
}

module.exports = DSHProcessor;
