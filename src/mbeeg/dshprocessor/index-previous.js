"use strict";

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class EpochsProcessor extends require('stream').Transform {//TODO split into two classes reformation and featurization
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
    
    epochs.on(`data`, epoch => {//TODO move this to _transform
      this.epochInWork = epoch.number;
      let
        channelsNumber = epoch.channels.length
        , samplesNumber = epoch.channels[0].length
      ;
      if (this.stimuliIdArray.every(s => s !== epoch.key)) {//this key not considering now
        console.log(`--DEBUG::        EpochProcessor:: key ${epoch.key} not in keys array ${this.stimuliIdArray} = ${this.stimuliIdArray.every(s => s !== epoch.key)} so throw it away`);
        return;
        // cb();
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
      // console.log(JSON.stringify(this.stimuliFlows, null, 2));
      for (let i of this.stimuliIdArray)
        if (this.stimuliFlows[i] === undefined) {//stimuliFlows is not full yet
          return;
          // cb();
        }
      if (this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.depth)))) {//averaging depth has assigned and every sample vector is filled at least to that depth
        // console.log(epoch.key);//it means that all of stimuli have been filled with samples into assigned depth
        if (moving) {//calculation of moving average is required
          this.write(this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.slice(0, this.depth)))));
          //cb(null, this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.slice(0, this.depth)))));
          for (let s = 0; s < this.movingStep; s++)//now delete processed samples
            this.stimuliFlows.forEach(key => key.forEach(ch => ch.forEach(samples => samples.shift())));
        } else {//calculation of consequitive averages is required
          this.write(this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.depth)))));
          // cb(null, this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.depth)))));
        }
      } else if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle)))) {//averaging depth wasn't assigned, it means that averaging on depth of all processed cycles is required
        this.write(this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.slice(0, this.cycle)))));
        // cb(null, this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.slice(0, this.cycle)))));
        this.cycle++;
        if (this.cycle > this.maximumCycleCount) {
          // this._resetCycle();
          this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.cycle - 1))));
          this.cycle = 1;
        }
      }
    });
  }
  
  reset(stimuliIdArray) {
    this.stimuliIdArray = stimuliIdArray;
    this.stimuliFlows = [];
    this.cycle = 1;
  }
  
  _resetCycle() {
    // if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle)))) {
    if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle - 1)))) {
      this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.cycle))));
      this.cycle = 1;
    }
    // else if (!this.depth && this.stimuliFlows.every(k => k.every(ch => ch.every(s => s.length >= this.cycle - 1)))) {
    //   this.stimuliFlows.map(key => key.map(ch => ch.map(samples => samples.splice(0, this.cycle - 1))));
    //   this.cycle = 1;
    // }
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
