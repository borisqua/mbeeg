"use strict";

class EEG extends require(`stream`).Transform {
  constructor({
                samplingRate = 0,
                // stringify = false,
                objectMode = true
              }) {
    super({objectMode});
    this.objectMode = objectMode;
    this.samplingRate = samplingRate;
    // this.stringify = stringify;
  }
  
  // noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param channels - eeg vector of channels samples.
   * If this.timestampFieldIndex != -1 then vector[timestampFieldIndex] contains
   * vector samples timestamp.
   * @param encoding
   * @param cb
   * @private
   */
  _transform(channels, encoding, cb) {
    //first field of sample vector always contains timestamp
    let sample = [+channels[0]];//timestamp
    for (let i = 1; i < channels.length; i++)
      sample.push(+channels[i]);//samples from channels
    if (this.samplingRate)
      setTimeout(() => {
        if (this.objectMode) {
          cb(null, sample);
        } else {
          cb(null, JSON.stringify(sample, null, 2));
        }
      }, 1000 / this.samplingRate);
    else {
      if (this.objectMode) {
        cb(null, sample);
      } else {
        cb(null, JSON.stringify(sample, null, 2));
      }
    }
  }
}

module.exports = EEG;
