"use strict";

/**
 * @class EpochSeries transforms input epochs stream into epoch series array that contains various sets of epochs samples
 * assembled into vectors of same samples from adjacent epochs.
 * Epochs can be arranged into sequences according to passed rule, as example:
 *  TODO - moving fixed segments [0,1,2],[1,2,3],[2,3,4],[3,4,5],....
 *  TODO - adjacent fixed segments [0,1,2],[3,4,5],[6,7,8],....
 *  - adjacent incremental segments [0],[0,1],[0,1,2],[3],[3,4],[3,4,5],[6],[6,7],...
 */
class EpochSeries extends require('stream').Transform {//TODO split into two classes reformation and featurization
  /**
   *
   * @param {Function} nextSeriesIsReady - should return true if series complete otherwise returns false
   * @param stimuliIdArray
   * @param {Number} depth
   * @param {Boolean} moving
   * @param {Boolean} incremental
   */
  constructor({
                //packingRule ()=>{}//TODO series packing method should be passed as parameter
                stimuliIdArray = [],
                depth,
                moving,
                incremental,
              }) {
    super({objectMode: true});
    this.epochInWork = 0;
    this.stimuliIdArray = stimuliIdArray.slice();
    this.depth = depth;
    this.moving = moving;
    this.incremental = incremental;
    this.stimuliFlows = []; //array[key_id][channel][samples][sample] of sample-vectors indexed by stimuli ids. Vectors arranged by channels. Vectors are here to reduce noise by signal averaging
    this.cycle = -1;
    this.idCountsArray = stimuliIdArray.reduce((acc, v) => {//counts repetitions of id in stimuliIdArray
      if (acc[v] === undefined)
        acc[v] = 1;
      else
        acc[v]++;
      return acc;
    }, [])
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    if (this.stimuliIdArray.every(s => s !== epoch.key)) {//current epoch.key probably from previous stimuli-set and it isn't considering now
      console.log(`--DEBUG::         EpochSeries:: key ${epoch.key} not in keys array ${this.stimuliIdArray} = ${this.stimuliIdArray.every(s => s !== epoch.key)} so throw it away`);
      cb();
      return;
    }
    
    this.epochInWork = epoch.number;
    
    let
      channelsNumber = epoch.channels.length
      , samplesNumber = epoch.channels[0].length
      , innerCycle = epoch.cycle - this.cycle
    ;
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
    
    console.log(`--DEBUG::        EpochSeries:: id counts [${this.idCountsArray}] epoch.cycle = ${epoch.cycle}; this.cycle=${this.cycle}`);
  
    for (let i of this.stimuliIdArray) {//check if stimuliFlows is not full yet
      console.log(`--DEBUG::        EpochSeries::Check if stimuliFlows full or not. Currnet stimuliId ${i}`);
      if (this.stimuliFlows[i] === undefined || this.stimuliFlows[i].every(ch => ch.every(s => s.length !== innerCycle * this.idCountsArray[i]))) {
        console.log(`--DEBUG::          EpochSeries::stimuliFlows not full yet; stimuliId undefined - ${this.stimuliFlows[i] === undefined}`);
        // console.log(JSON.stringify(this.stimuliFlows, null, 2));
        cb();
        return;
      }
    }
    if (this.incremental) {//TODO series packing method should be passed as parameter
      console.log(`--DEBUG::        EpochSeries::NextEpochPackReady--`);
      // console.log(JSON.stringify(this.stimuliFlows, null, 2));
      
      cb(null, this.stimuliFlows);
      if (innerCycle === this.depth) {
        this.cycle = epoch.cycle;
        this.stimuliFlows = [];
      }
    } else
      cb();
  }
  
  reset(stimuliIdArray) {
    this.stimuliIdArray = stimuliIdArray;
    this.stimuliFlows = [];
    this.idCountsArray = stimuliIdArray.reduce((acc, v) => {//counts repetitions of id in stimuliIdArray
      if (acc[v] === undefined)
        acc[v] = 1;
      else
        acc[v]++;
      return acc;
    }, [])
  }
  
}

module.exports = EpochSeries;
