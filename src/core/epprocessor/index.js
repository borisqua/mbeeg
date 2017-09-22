"use strict";

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class EpochsProcessor extends require(`stream`).Transform {
  constructor({
                epochs,
                depth = 1,
                moving = true,
                movingStep = 1,
                // learning = false,
                // window = 200,
                // offset = 200,
                sequence = `avg, detrend`,
                objectMode = true
              }) {
    super({objectMode: true});
    this.depth = depth;
    this.stimuliFlows = []; //array[key_id][channel][sampleVector][sample] of sample-vectors indexed by stimuli ids. Vectors arranged by channels. Vectors are here to reduce noise by signal averaging
    this.objectMode = objectMode;
    
    epochs.on(`data`, epoch => {
      let
        channelsNumber = epoch.channels.length,
        samplesNumber = epoch.channels[0].length;
      
      for (let ch = 0; ch < channelsNumber; ch++) {
        for (let s = 0; s < samplesNumber; s++) {
          if (this.stimuliFlows[epoch.key] === undefined) {
            this.stimuliFlows[epoch.key] = new Array(channelsNumber).fill([]);
          }
          if (this.stimuliFlows[epoch.key][ch][s] === undefined)
            this.stimuliFlows[epoch.key][ch][s] = [epoch.channels[ch][s]];
          else
            this.stimuliFlows[epoch.key][ch][s].push(epoch.channels[ch][s]);
          
          if (this.stimuliFlows[epoch.key][ch][s].length > depth) {//it means that all of stimuli have been filled with samples onto assigned depth
            if (moving) {
              this.write(this.stimuliFlows.slice(0, depth));
              for (let s = 0; s < movingStep; s++)
                this.stimuliFlows.forEach(key => key.forEach(channel => channel.forEach(sample => sample.shift())));
            } else {
              this.write(this.stimuliFlows.splice(0, depth));
            }
          }
        }
      }
    });
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(cycle, encoding, cb) {
    
    if (this.objectMode)
      cb(null, this.avgEpoch(cycle));
    else
      cb(null, JSON.stringify(this.avgEpoch(cycle), null, 2));

    // if (this.objectMode)
    //   cb(null, cycle);
    // else
    //   cb(null, JSON.stringify(cycle, null, 2));
  
  }
  
  /** @function avgEpoch calculates avg sample values for each channel (sum of ch from all epochs for given key divided by number
   *  of epochs for given key)
   * of that key epochs)
   *
   * @param {Array} cycle - array of epochs of the same stimulus from within the same stimulation session
   * @return {Array} Average epochs with samples equal to arithmetic average of samples from all input epochs
   */
  avgEpoch(cycle) {
    //FEATURES-PROCESSING STARTS HERE
    let features = [[]];
    for (let stimulus of cycle) {
      if (!stimulus) continue;
      let stimulusIdx = cycle.indexOf(stimulus);
      if (features[stimulusIdx] === undefined)
        features[stimulusIdx] = new Array(stimulus.length).fill([]);
      for (let channel of stimulus) {
        let channelIdx = stimulus.indexOf(channel);
        if (features[stimulusIdx][channelIdx] === undefined)
          features[stimulusIdx][channelIdx] = [];
        for (let samples of channel) {
          let sampleIdx = channel.indexOf(samples);
          features[stimulusIdx][channelIdx][sampleIdx] = samples.reduce((a, b) => a + b) / samples.length; //avg sample
        }
      }
    }
    return features;
  }
}

module.exports = EpochsProcessor;
