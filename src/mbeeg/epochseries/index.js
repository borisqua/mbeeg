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
    this.stimuliIdArray = stimuliIdArray.slice();
    this.cycleLength = stimuliIdArray.length;
    this.epoch = -1; //in epochSeries internal epochs counter
    this.cycle = -1; //in epochSeries internal cycles counter
    this.cycleInWork = -1; //last incoming epoch (-1 means that no one of epochs hash't comming yet)
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
    //check requirements for incoming epochs sequence:
    //epoch.key must be equal to one of stimuliIdArray elements
    if (this.stimuliIdArray.every(s => s !== epoch.key)) {//current epoch.key probably from previous stimuli-set and it isn't considering now
      log(`           :: -- junk epoch detected -- epoch key ${epoch.key} not in keys array ${this.stimuliIdArray} = ${this.stimuliIdArray.every(s => s !== epoch.key)} so throw it away`);
      cb();//if so then skip this epoch
      return;
    }
    //and they must have the same cycle number until their quantity have reached specified cycle length
    if (this.cycleInWork !== epoch.cycle && (this.epoch + 1) % this.cycleLength){//cycle has changed but cycleLength doesn't reached
      log(`           :: -- junk epoch detected --`);
      log(`           :: epoch with wrong cycle number ${epoch.cycle}, but current cycle is ${this.cycleInWork} so throw it away`);
      this.reset(this.stimuliIdArray);//if so then flush results assossiated with those wrong epochs and start new series cycle with new epoch
      this.cycleInWork = epoch.cycle;
    }
    
    this.epoch++;
    this.cycle = Math.floor(this.epoch / this.cycleLength);
    
    log(`           ::epochSeries depth limit - [${this.depthLimit}];`);
    log(`           ::id counts in single cycle - [${this.idCountsArray}]; epoch key/#/cycle - ${epoch.key}/${epoch.number}/${epoch.cycle}; series depth (epoch/cycles) - ${this.epoch}/${this.cycle}`);
    if (this.cycle + 1 > this.depthLimit) {
      this.reset(this.stimuliIdArray);
      this.epoch++;
      this.cycle = Math.floor(this.epoch / this.cycleLength);
      log(`           :: reset due to reaching depth limit --`);
      log(`           ::id counts in single cycle - [${this.idCountsArray}]; epoch key/#/cycle - ${epoch.key}/${epoch.number}/${epoch.cycle}; series depth (epoch/cycles) - ${this.epoch}/${this.cycle}`);
    }
    
    //fill series with epoch data
    for (let ch = 0, channelsNumber = epoch.channels.length; ch < channelsNumber; ch++) {//[keyN [channelN [sampleN [sN..]]]]
      for (let s = 0, samplesNumber = epoch.channels[0].length; s < samplesNumber; s++) {
        if (this.stimuliFlows[epoch.key] === undefined) {
          this.stimuliFlows[epoch.key] = new Array(channelsNumber).fill([]);
        }
        if (this.stimuliFlows[epoch.key][ch][s] === undefined)
          this.stimuliFlows[epoch.key][ch][s] = [epoch.channels[ch][s]];
        else
          this.stimuliFlows[epoch.key][ch][s].push(epoch.channels[ch][s]);
      }
    }
    
    //check if series cycle complete
    log(`           ::Check if stimuliFlows full or not. Current stimuliId ${epoch.key}`);
    // log(JSON.stringify(this.stimuliFlows, null, 0));
    if ((this.epoch + 1) % this.cycleLength) {//if current cycle not complete yet
      log(`           :: -- stimuliFlows not full yet --`);
      cb();//then skip on this itteration without writing to readable part of stream
      return;
    }
    cb(null, this.stimuliFlows);//else write result (stimuliFlows) into readable part of stream
    this.stimuliFlows.forEach(key =>//and apply procedure (next) on samples to modify or prepare them to the next series cycle
      key.forEach(channel =>
        channel.forEach(samples =>
          this.next(samples))));
    log(`           :: -- Next epochSeries ready --`);
  }
  
  reset(stimuliIdArray) {
    this.epoch = -1;
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
