"use strict";

class EEG extends require(`stream`).Transform {
  /**
   *
   * @param {Number} samplingRate - digital signal sampling rate
   * @param {Array} channels - subset of channels id from all available to listen
   * @param {Boolean} objectMode - whether stream should work in object mode or not
   */
  constructor({
                samplingRate = 0,
                channels = [0],
                objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.samplingRate = samplingRate;
    this.channels = channels;
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
      if (this.channels.includes(i))
        sample.push(+channels[i]);//samples from channels
    if (this.samplingRate)
      setTimeout(() => {
        if (this.objectMode) {
          cb(null, sample);
        } else {
          cb(null, `${JSON.stringify(sample)}\n`);
        }
      }, 1000 / this.samplingRate);
    else {
      if (this.objectMode) {
        cb(null, sample);
      } else {
        cb(null, `${JSON.stringify(sample)}\n`);
      }
    }
  }
}

module.exports = EEG;
