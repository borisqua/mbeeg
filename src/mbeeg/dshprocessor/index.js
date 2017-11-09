"use strict";

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class DSHProcessor extends require('stream').Transform {
  constructor({
                //action = ()=>{}//TODO action with epochs-pack should be passed as parameter
                // learning = false,
              }={}) {
    super({objectMode: true});
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(cycle, encoding, cb) {
    console.log(`--DEBUG::           DSHProcessor::NextFeatureReady--`);
    cb(
      null,
      cycle.map(key =>//TODO action with epochs-pack should be passed as parameter
        key.map(ch =>
          ch.map(samples =>
            samples.reduce((a, b) => a + b) / samples.length)))
    );
  }
  
}

module.exports = DSHProcessor;
