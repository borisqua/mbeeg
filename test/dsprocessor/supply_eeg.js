"use strict";

const {Readable} = require(`stream`),
  fs = require(`fs`),
  split2 = require(`split2`);

class EEG extends Readable {
  constructor(options = {objectMode: true}) {
    super(options);
    this.eegArray = [];
    let timestamp = new Date().getTime();
    fs.createReadStream(`./data/1.0_sourceEEG/sourceEEG.csv`)
      .pipe(split2())
      .on(`data`, (chunk) => {
        let channels = JSON.parse(`[${chunk}]`);
        let sample = [
          // process.hrtime()[0] * 1000000000 + process.hrtime()[1],
          timestamp += 4,
          channels[0],
          channels[1]
        ];
        this.eegArray.push(sample);
      });
    this.index = 0;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read() {
    setTimeout(() => {
      this.index++; this.index %= this.eegArray.length;
      this.push(JSON.stringify(this.eegArray[this.index]));// + `\r\n`
      // this.push(this.eegArray[this.index]);
    }, 4);
  }
}

module.exports = EEG;
// let eeg = new EEG();
// eeg.pipe(process.stdout);