"use strict";

const
  appRoot = require('app-root-path')
  , csv = require('csv-streamify')
  , parser = csv({ objectMode: true })
  , {Readable} = require('stream')
  , fs = require('fs')
;

class EEG extends Readable {
  constructor(options = {objectMode: true}) {
    super(options);
    this.eegArray = [];
    fs.createReadStream(`${appRoot}/test/DSVProcessor/data/raweeg.csv`)
      .on('error', (err) => {
        throw err;
      })
      .pipe(parser)
      .on(`data`, (chunk) => {
        let channels = JSON.parse(`[${chunk}]`);
        let sample = [
          0,
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
      this.index++;
      if(this.index >= this.eegArray.length) throw "That's all folks";
      this.index %= this.eegArray.length;
      this.eegArray[this.index][0] = new Date().getTime();
      // this.push(JSON.stringify(this.eegArray[this.index]));// + `\r\n`
      this.push(this.eegArray[this.index]);
    }, 4);
  }
}

if (module.parent) {
  module.exports = EEG;
} else {
  let eeg = new EEG();
  eeg.pipe(process.stdout);
}
