"use strict";
const log = require('debug')('mbeeg:EpochSeries');

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
   */
  constructor({
                //packingRule ()=>{}//TODO series packing method should be passed as parameter
                stimuliIdArray = [],
                depthLimit = 0, //if 0 then there is no depth restriction
                speed = 1, //determines when to push into readable
                next = series => series  //recursive calculation of initial condition of samples in epoch series for the next step
              }) {
    super({objectMode: true});
    // this.epochInWork = -1;//-1 means that no one epoch not reached epochSeries stage yet
    this.stimuliIdArray = stimuliIdArray.slice();
    this.cycleLength = stimuliIdArray.length;
    this.cycle = -1; //in epochSeries internal epochs cycles counter
    this.depthLimit = depthLimit;//max possible depth limit
    this.stimuliFlows = []; //array[key_id][channel][samples][sample] of sample-vectors indexed by stimuli ids. Vectors arranged by channels. Vectors are here to reduce noise by signal averaging
    this.next = next; //initial state of samples in series for the next iterration
    this.idCountsArray = stimuliIdArray.reduce((acc, v) => {//counts of repetitions of id in stimuliIdArray
      if (acc[v] === undefined)
        acc[v] = 1;
      else
        acc[v]++;
      return acc;
    }, [])
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    this.cycle++;
    log(`           ::epoch key/#/cycle - ${epoch.key}/${epoch.number}/${epoch.cycle}; series cycle - ${this.cycle}`);
    if (this.stimuliIdArray.every(s => s !== epoch.key)) {//current epoch.key probably from previous stimuli-set and it isn't considering now
      log(`           :: key ${epoch.key} not in keys array ${this.stimuliIdArray} = ${this.stimuliIdArray.every(s => s !== epoch.key)} so throw it away`);
      cb();
      return;
    }
    
    // this.epochInWork = epoch.number;
    
    let
      channelsNumber = epoch.channels.length
      , samplesNumber = epoch.channels[0].length
    ;
    //fill series with epoch data
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
    
    log(`           :: ids counts [${this.idCountsArray}] series depth ${this.cycle}`);
    //check if series cycle complete
    // for (let i of this.stimuliIdArray) {//check if stimuliFlows is not full yet
    log(`           ::Check if stimuliFlows full or not. Current stimuliId ${i}`);
    // log(JSON.stringify(this.stimuliFlows, null, 0));
    // if (this.stimuliFlows[i] === undefined || this.stimuliFlows[i].every(ch => ch.every(s => s.length !== this.cycle * this.idCountsArray[i]))) {
    if (this.cycle % this.cycleLength) {//current cycle not complete yet
      log(`           :: -- stimuliFlows not full yet --`); // stimuliId ${i} undefined - ${this.stimuliFlows[i] === undefined}`);
      cb();
      return;
    }
    // }
    log(`           :: -- Next epochSeries ready --`);
    // log(JSON.stringify(this.stimuliFlows, null, 2));
    cb(null, this.stimuliFlows);
    this.stimuliFlows.forEach(key =>
      key.forEach(channel =>
        channel.forEach(samples =>
          this.next(samples))));
    if (depth === this.depthLimit) {
      this.reset(this.stimuliIdArray);
      // this.cycle = epoch.cycle;
      // this.stimuliFlows = [];
    }
  }
  
  reset(stimuliIdArray) {
    this.cycle = -1;
    this.stimuliIdArray = stimuliIdArray.slice();
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
