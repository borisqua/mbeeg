"use strict";
const
  appRoot = require('app-root-path'),
  {Tools} = require('mbeeg');

class Classifier extends require('stream').Transform {
  constructor({
                method = (feature, start = 0, end = feature.length, channel = 0) =>
                  feature[channel].slice(start, end).reduce((acc, val) => Math.abs(acc + val), 0),
                objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.method = method;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(features, encoding, cb) {
    let classification = [];
    
    for (let feature of features)
      // method = (feature, start = 0, end = feature.length) => feature.slice(start, end).reduce((acc, val) => {
      // classification[features.indexOf(feature)] = this.method(feature);
      classification[features.indexOf(feature)] = Tools.absIntegral(feature[0], 250, 200, 300)//(feature, start = 0,
    // end = feature.length) => feature.slice(start, end).reduce((acc, val) => Math.abs(acc + val));
    let sum = classification.reduce((a, b) => a + b);
    classification.forEach((v, i, arr) => arr[i] = v / sum);//normalization
    
    if (this.objectMode)
      cb(null, classification);
    else
      cb(null, JSON.stringify(classification, null, 2));
  }
  
}

module.exports = Classifier;

