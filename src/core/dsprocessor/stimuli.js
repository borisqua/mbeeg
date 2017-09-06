"use strict";

class Stimuli extends require(`stream`).Transform {
  constructor({
                // stringify = false,
                signalDuration = 0,
                pauseDuration = 0,
                objectMode = true
              }) {
    super({objectMode});
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.objectMode = objectMode;
    // this.stringify = stringify;
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param stimulus - eeg vector of channels samples.
   * If this.timestampFieldIndex != -1 then vector[timestampFieldIndex] contains
   * vector samples timestamp.
   * @param encoding
   * @param cb
   * @private
   */
  _transform(stimulus, encoding, cb) {
    //first field of sample vector always contains timestamp
    if (this.signalDuration + this.pauseDuration)
      setTimeout(() => {
        if (this.objectMode) cb(null, [+stimulus[0], +stimulus[1], +stimulus[2]]);
        else cb(null, JSON.stringify([+stimulus[0], +stimulus[1], +stimulus[2]], null, 2));
      }, this.signalDuration + this.pauseDuration);
    else {
      if (this.objectMode) cb(null, [+stimulus[0], +stimulus[1], +stimulus[2]]);
      else cb(null, JSON.stringify([+stimulus[0], +stimulus[1], +stimulus[2]], null, 2));
    }
  }
}

module.exports = Stimuli;
