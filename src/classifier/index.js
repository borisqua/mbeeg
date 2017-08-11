"use strict";
const
  {Transform} = require(`stream`);

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class Classifier extends Transform {
  constructor({
                cycles = 5,
                learning = false,
                window = 200,
                offset = 200,
                sequence = `filter, detrend`,
                objectMode = true,
                stringifyOutput = false
              }) {
    super({objectMode});
    this.cycles = cycles;
    this.learning = learning;
    this.stimuliFlows = [];
    this.stringify = stringifyOutput;
    
  }
  
  _transform(epoch, encoding, cb) {
    let
      features= [],
      keys = epoch.stimuliNumber,
      channels = epoch.channels.length,
      samples = epoch.channels[0].length;
    
    
    if (this.stimuliFlows[epoch.key] === undefined) {
      this.stimuliFlows[epoch.key] = [];
      for (let i = 0; i < channels; i++)
        this.stimuliFlows[epoch.key].push([]);
    }
    
    for (let ch = 0; ch < channels; ch++)
      for (let s = 0; s < samples; s++) {
        if (this.stimuliFlows[epoch.key][ch][s] === undefined)
          this.stimuliFlows[epoch.key][ch][s] = [];
        this.stimuliFlows[epoch.key][ch][s].push(epoch.channels[ch][s]);
        //HERE FEATURES-PROCESSING STARTS
        if (this.stimuliFlows[epoch.key][ch][s].length > this.cycles) {//means that all of stimuli have filled on to averaging depth
          //shift samples from stimuli flows calculate the feature and push it into features vector
          for (let k = 0; k < keys; k++)
            for (let ch = 0; ch < channels; ch++)
              for (let s = 0; s < samples; s++) {
                if (features[k] === undefined)
                  features[k] = [];
                if (features[k][ch] === undefined)
                  features[k][ch] = [];
                let cycle = this.stimuliFlows[k][ch][s].splice(0, this.cycles);//shift samples
                features[k][ch].push(cycle.reduce((a, b) => a + b) / cycle.length);//push avg feature
                // featuresFromEpochs[k][ch].push(cycle.reduce((a, b) => (a + b)/2));//push 2-point moving avg feature
              }
        }
      }
    if (this.stringify)
      cb(null, JSON.stringify(this.stimuliFlows, null, 2));
    else
      cb(null, this.stimuliFlows);
  }
  
  /**
   * @method feed - prepares data to classificator input
   *
   * @return {Array} array of patterns. Pattern is an object {key, timestamp, channel, samples} where "samples" is
   * an array of samples prepared to feed to classification function for learning or recognizing/prediction
   */
  feed() {
    let result = [];
    for (let k = 0, keysNumber = this.stimuliFlows.length; k < keysNumber; k++) {
      let keyEpochs = this.stimuliFlows[k];
      let input = keyEpochs.splice(0, this.cycles);//input == [channels1==[[ch1][ch2]], channels2==[[ch1],[ch2]], ...]
      if (!!input) {
        result[k] = this.avgEpochs(input);
      }
    }
    return result;
  }
  
  /** @function avgEpochs calculates avg sample values for each channel (sum of ch from all epochs for given key divided by number
   *  of epochs for given key)
   * of that key epochs)
   *
   * @param {Array} epochsArray - array of epochs of the same stimulus from within the same stimulation session
   * @return {Array} Average epochs with samples equal to arithmetic average of samples from all input epochs
   */
  avgEpochs(epochsArray) {
    let avgVector = new Array(epochsArray[0][0].length);
    
    const
      channelsNumber = epochsArray[0].length,
      samplesLength = epochsArray[0][0].length;
    
    for (let channel = 0; channel < channelsNumber; channel++) {
      for (let sample = 0; sample < samplesLength; sample++) {
        for (let epoch of epochsArray) {
          avgVector[channel][sample] += epoch[channel][sample];
        }
        avgVector[channel][sample] /= this.cycles;
      }
    }
    
    return avgVector;
  }
  
}

module.exports = Classifier;
