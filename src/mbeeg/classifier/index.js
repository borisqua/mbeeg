"use strict";
const
  {Tools} = require('../tools');

class Classifier extends require('stream').Transform {
  constructor({
                method = "integral",
                methodParameters = {start: 200, window: 300},
                objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.method = method;
    this.methodParameters = methodParameters;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(stimuliAvgEpochs, encoding, cb) {
    let classification = [];
    for (let stimulusAvgChannels of stimuliAvgEpochs) {
      this.methodParameters.feature = stimulusAvgChannels[0];//TODO instead feature[0] here should be procedure for every channel
      classification[stimuliAvgEpochs.indexOf(stimulusAvgChannels)] = Tools.absIntegral(this.methodParameters)
    }
    let sum = classification.reduce((a, b) => a + b);
    classification.forEach((v, i, arr) => arr[i] = v / sum);//normalization
    
    if (this.objectMode)
      cb(null, classification);
    else
      cb(null, JSON.stringify(classification, null, 2));
  }
  
}

module.exports = Classifier;

