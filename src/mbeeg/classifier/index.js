"use strict";
const
  {Tools} = require('../tools');

class Classifier extends require('stream').Transform {
  constructor({
                method,
                methodParameters,
                objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.method = method;
    this.methodParameters = methodParameters;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(stimuliAvgEpochs, encoding, cb) {
    console.log(`--DEBUG::            Classifier::NextVerdictReady--`);
    let classification = [];
    for (let i = 0; i < stimuliAvgEpochs.length; i++) {
      let stimulusAvgChannels = stimuliAvgEpochs[i];
      if (stimulusAvgChannels) {
        for (let ch of stimulusAvgChannels)
          this.methodParameters.feature = ch;
        classification[i] = Tools.absIntegral(this.methodParameters)
      } else {
        classification[i] = 0;
      }
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

