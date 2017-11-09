"use strict";

class Classifier extends require('stream').Transform {
  constructor({
                method //method of feature processing
                , methodParameters
                , normalize = true //TODO method of postprocessing (e.g. normalize, rescale etc.) of classification matrix as whole
              }) {
    super({objectMode: true});
    this.method = method;
    this.methodParameters = methodParameters;
    this.normalize = normalize;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(features, encoding, cb) {
    console.log(`--DEBUG::             Classifier::NextVerdictReady--`);
    let classification = features.reduce((acc, key, keyId) => {
      if (!acc.length) acc = new Array(key.length).fill([]);
      key.forEach((channel, ch) => {
        this.methodParameters.feature = channel;
        acc[ch][keyId] = this.method(this.methodParameters);
      });
      return acc;
    }, []);
    
    for (let channel = 0; channel < classification.length; channel++) {
      if (this.normalize) {//TODO transfer this to method of postprocessing (of classification matrix as whole)
        for (let channel = 0; channel < classification.length; channel++) {
          let sum = classification[channel].reduce((a, b) => a + b);
          classification[channel].forEach((v, i, arr) => arr[i] = v / sum);//normalization
        }
        for (let i = 0; i < classification[channel].length; i++)
          if (classification[channel][i] === undefined)
            classification[channel][i] = 0;
      }
      
      cb(null, classification);
    }
  }
}

module.exports = Classifier;

