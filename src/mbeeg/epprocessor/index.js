"use strict";

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class EpochsProcessor extends require('stream').Transform {
  constructor({
                epochs,
                stimuliIdArray = [],
                // stimuliNumber = 0,
                depth = 1,
                moving = true,
                movingStep = 1,
                maximumCycleCount = 15,
                // learning = false,
                // window = 200,
                // offset = 200,
                // sequence = `avg, detrend`,
                objectMode = true
              }) {
    super({objectMode: true});
    this.epochs = epochs;
    this.stimuliIdArray = stimuliIdArray.slice();
    // this.stimuliNumber = stimuliNumber;//this.epochs.stimuli.stimuliArray().length;
    this.depth = depth;
    this.moving = moving;
    this.movingStep = movingStep;
    this.stimuliFlows = []; //array[key_id][channel][samples][sample] of sample-vectors indexed by stimuli ids. Vectors arranged by channels. Vectors are here to reduce noise by signal averaging
    this.objectMode = objectMode;
    this.cycle = 1;
    this.maximumCycleCount = maximumCycleCount;
    
    epochs.on(`data`, epoch => {
      let
        channelsNumber = epoch.channels.length
        , samplesNumber = epoch.channels[0].length
        // , epochCycle = epoch.cycle
      ;
  
      console.log(`${epoch.key} in ${this.stimuliIdArray} = ${this.stimuliIdArray.every(s => s !== epoch.key)}`);
      if (this.stimuliIdArray.every(s => s !== epoch.key)) return;
      for (let ch = 0; ch < channelsNumber; ch++) {
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
      // console.log(JSON.stringify(this.stimuliFlows, null, 2));
      // if (this.stimuliFlows.length === this.stimuliNumber)
      for (let i of this.stimuliIdArray)
        if (this.stimuliFlows[i] === undefined) return;
      if (this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.depth)))) {
        // console.log(epoch.key);//it means that all of stimuli have been filled with samples into assigned depth
        if (moving) {
          this.write(this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.slice(0, this.depth)))));
          for (let s = 0; s < this.movingStep; s++)
            this.stimuliFlows.forEach(key => key.forEach(ch => ch.forEach(samples => samples.shift())));
        } else {
          this.write(this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.depth)))));
        }
      } else if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle)))) {
        this.write(this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.slice(0, this.cycle)))));
        this.cycle++;
        if (this.cycle > this.maximumCycleCount) this._resetCycle();
      }
    });
  }
  
  reset(stimuliArray) {
    this.stimuliIdArray = stimuliArray;
    this.stimuliFlows = [];
    this.cycle = 1;
  }
  
  _resetCycle() {
    if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle)))) {
      this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.cycle))));
      this.cycle = 1;
    }
    else if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle - 1)))) {
      this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.cycle - 1))));
      this.cycle = 1;
    }
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

module.exports = EpochsProcessor;
