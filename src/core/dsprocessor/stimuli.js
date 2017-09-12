"use strict";

class Stimuli extends require(`stream`).Transform {
  constructor({
                signalDuration = 0,
                pauseDuration = 0,
                objectMode = true
              }) {
    super({objectMode: true});
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.objectMode = objectMode;
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {{timestamp, stimulusID, isTarget}} stimulus - vector of stimulus with timestamp and target flag (use in learning mode only)
   * @param encoding
   * @param cb
   * @private
   */
  _transform(stimulus, encoding, cb) {
    //first field of sample vector always contains timestamp
    if (this.signalDuration + this.pauseDuration)
      setTimeout(() => {
        if (this.objectMode) cb(null, [+stimulus[0], +stimulus[1], +stimulus[2]]);
        else cb(null, `${JSON.stringify([+stimulus[0], +stimulus[1], +stimulus[2]])}\n`);
      }, this.signalDuration + this.pauseDuration);
    else {
      if (this.objectMode) cb(null, [+stimulus[0], +stimulus[1], +stimulus[2]]);
      else cb(null, `${JSON.stringify([+stimulus[0], +stimulus[1], +stimulus[2]])}\n`);
    }
  }
}

module.exports = Stimuli;
