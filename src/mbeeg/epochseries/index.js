"use strict";

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class EpochSeries extends require('stream').Transform {//TODO split into two classes reformation and featurization
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
    this.cycle = 0;
    this.maximumCycleCount = maximumCycleCount;
    
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    this.epochInWork = epoch.number;
    let
      channelsNumber = epoch.channels.length
      , samplesNumber = epoch.channels[0].length
    ;
    if (this.stimuliIdArray.every(s => s !== epoch.key)) {//this key probably from previous stimuli-set and it isn't considering now
      console.log(`--DEBUG::        EpochPacks:: key ${epoch.key} not in keys array ${this.stimuliIdArray} = ${this.stimuliIdArray.every(s => s !== epoch.key)} so throw it away`);
      cb();
    }
    for (let ch = 0; ch < channelsNumber; ch++) {//[keyN [channelN [sampleN [sN..]]]]
      for (let s = 0; s < samplesNumber; s++) {
        if (this.stimuliFlows[epoch.key] === undefined) {
          this.stimuliFlows[epoch.key] = new Array(channelsNumber).fill([]);
        }
        if (this.stimuliFlows[epoch.key][ch][s] === undefined)
          this.stimuliFlows[epoch.key][ch][s] = [epoch.channels[ch][s]];
        else
          this.stimuliFlows[epoch.key][ch][s].push(epoch.channels[ch][s]);
        
      }
    }
    if (this.depth && epoch.cycle - this.cycle > this.depth) {
      console.log(`--DEBUG::        EpochPacks::NextEpochPackReady--`);
      cb(null, this.stimuliFlows);
      this.cycle = epoch.cycle;
    }
    else
      cb();
  }
  
  reset(stimuliIdArray) {
    this.stimuliIdArray = stimuliIdArray;
    this.stimuliFlows = [];
  }
  
}

module.exports = EpochSeries;
