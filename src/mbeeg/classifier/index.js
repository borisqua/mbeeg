"use strict";
const log = require('debug')('mbeeg:Classifier');

class Classifier extends require('stream').Transform {
  constructor({
                method //method of feature processing
                , methodParameters
                , postprocessing = vector => vector
              }) {
    super({objectMode: true});
    this.method = method;
    this.methodParameters = methodParameters;
    this.postprocessing = postprocessing;//TODO eliminate this and use pipe to DSVProcessor instead
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(features, encoding, cb) {
    log(`             ::NextVerdictReady`);
    let classification = features.reduce((acc, key, keyId) => {
      if (!acc.length) acc = new Array(key.length).fill([]);
      key.forEach((channel, ch) => {
        this.methodParameters.feature = channel;
        acc[ch][keyId] = this.method(this.methodParameters);
      });
      return acc;
    }, []);
    log(`             ::absolute values classification ${classification}`);
    for (let channel = 0; channel < classification.length; channel++) {
      classification[channel] = this.postprocessing(classification[channel]);
      for (let key = 0; key < classification[channel].length; key++)
        if (classification[channel][key] === undefined)
          classification[channel][key] = 0;
      log(`             ::postprocessed values classification ${classification}`);
      cb(null, classification);//TODO consider if each channel participate in decision making concurency
    }
  }
}

module.exports = Classifier;

