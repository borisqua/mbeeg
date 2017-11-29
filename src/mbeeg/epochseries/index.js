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
class EpochSeries extends require('stream').Transform {
  /**
   *
   * @param {Function} nextSeriesIsReady - should return true if series complete otherwise returns false
   * @param stimuliIdArray
   */
  constructor({
                stimuliIdArray = [],
                depthLimit = 0, //if 0 then there is no depth restriction
                // speed = 1, //determines when to push into readable (default is each first cycle)
                next = series => series  //recursive calculation of initial condition of samples in epoch series for the next step
              }) {
    super({objectMode: true});
    this.stimuliIdArray = stimuliIdArray.slice();
    this.cycleLength = stimuliIdArray.length;//number of all defined elements
    this.depthLimit = depthLimit;//max possible depth limit
    this.lastEpochCycle = -1; //last epoch cycle (-1 means that no one epoch hasn't come yet so there is no last epoch)
    this.epochInSeries = -1; //in epochSeries internal epochs counter (-1 means that no one series epochs has started yet, there is no epochs in the series)
    this.cyclesInSeries = 0; //in epochSeries internal cycles counter (-1 means that no one cycle has started yet, there is no cycles in the series)
    this.epochInSeriesCycle = (this.epochInSeries + 1) % this.cycleLength; //in epochSeries internal epochs counter (-1 means that no one series epochs has started yet, there is no epochs in the series)
    this.stimuliFlows = []; //array[key_id][channel][samples][sample] of sample-vectors indexed by stimuli ids. Vectors arranged by channels. Vectors are here to reduce noise by signal averaging
    this.next = next; //initial state of samples in series for the next iterration
    // this.idCountsArray = stimuliIdArray.reduce((acc, v) => {//counts of repetitions of id in stimuliIdArray
    //   if (acc[v] === undefined)
    //     acc[v] = 1;
    //   else
    //     acc[v]++;
    //   return acc;
    // }, [])
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    //1. check requirements for incoming epochs sequence:
    //1.1 epoch.key must be equal to one of stimuliIdArray elements (UML checking next epoch: e in stims)
    if (this.stimuliIdArray.every(s => s !== epoch.key)) {//current epoch.key probably from previous stimuli-set and it isn't considering now
      log(`           :: -- junk epoch detected -- epoch key ${epoch.key} not in keys array [${this.stimuliIdArray}] so throw it away`);
      cb();//if so then skip this epoch
      this.reset();//and reset series building cycle
      return;
    }
    //1.2 and incoming epochs must have the same cycle number until their quantity have reached specified cycle length (equal to stimuliIdArray length)
    //UML checking next epoch: (ec == lec || esc == 0) <=> !(ec == lec && esc != 0)
    if (this.lastEpochCycle !== epoch.cycle && this.epochInSeriesCycle) {//cycle has changed but cycleLength doesn't reached
      log(`           :: -- uncompleted series detected --`);
      log(`           :: incoming epoch with cycle number ${epoch.cycle}, but current cycle is ${this.lastEpochCycle} and it is incomplete so flush wrong cycle and start new one`);
      this.reset();//if so then flush results assossiated with those wrong epochs and start new series cycle with new epoch
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
  
    this.lastEpochCycle = epoch.cycle;
    this.epochInSeries++;
    this.cyclesInSeries = Math.floor(this.epochInSeries / this.cycleLength);//cycles with witch we have already worked in current series
    this.epochInSeriesCycle = (this.epochInSeries + 1) % this.cycleLength;
  
    //check if series cycle complete
    log(`           ::Check if stimuliFlows full or not. Current stimuliId ${epoch.key}`);
    // log(JSON.stringify(this.stimuliFlows, null, 0));
    if (this.epochInSeriesCycle) {//if current cycle not complete yet
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
    //incomin epoch number in series doesn't exceed assigned depthLimit
    log(`           ::epochSeries depthLimit - [${this.depthLimit}]; current cycleLength = ${this.cycleLength}; current series depth (in epochs/in cycles) - ${this.epochInSeries}/${this.cyclesInSeries}`);
    log(`           ::epoch key/#/cycle - ${epoch.key}/${epoch.number}/${epoch.cycle}; `);
    if (this.depthLimit && this.cyclesInSeries > this.depthLimit) { // if depthLimit == 0 => unlimited (or limited only by outer control)
      //incoming epoch number in series doesn't exceed assigned depthLimit
      this.reset();
      log(`           :: reset due to reaching depth limit --`);
      log(`           ::epochSeries depthLimit - [${this.depthLimit}]; current cycleLength = ${this.cycleLength}; current series depth (in epochs/in cycles) - ${this.epochInSeries}/${this.cyclesInSeries}`);
    }
  
  }
  
  reset(stimuliIdArray = this.stimuliIdArray) {
    this.stimuliFlows = [];
    this.epochInSeries = -1;
    this.stimuliIdArray = stimuliIdArray.slice();
    this.cycleLength = stimuliIdArray.length;//number of all defined elements
    // this.idCountsArray = stimuliIdArray.reduce((acc, v) => {//counts repetitions of id in stimuliIdArray
    //   if (acc[v] === undefined)
    //     acc[v] = 1;
    //   else
    //     acc[v]++;
    //   return acc;
    // }, [])
  }
  
}

module.exports = EpochSeries;
