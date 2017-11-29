"use strict";
const log = require('debug')('mbeeg:DSHProcessor');

/**
 * @class classifier transforms input sample sequence into array of pairs (identity, probability of identification)
 */
class DSHProcessor extends require('stream').Transform {
  constructor({
                //action = ()=>{}//todo action with epochs-pack should be passed as parameter
                // learning = false,
              }={}) {
    super({objectMode: true});
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(cycle, encoding, cb) {
    log(`           ::NextFeatureReady--`);
    cb(
      null,
      cycle.map(key =>//todo action with epochs-pack should be passed as parameter
        key.map(ch =>
          ch.map(samples =>
            samples.reduce((a, b) => a + b) / samples.length)))
    );
  }
  
}

module.exports = DSHProcessor;
