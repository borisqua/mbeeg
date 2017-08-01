"use strict";
const {Readable} = require(`stream`);

class Stimuli extends Readable {
  constructor(signalDuration = 130, pauseDuration = 170, options = { objectMode: true }) {
    super(options);
    this.idarray = [...new Array(13).keys()];
    this.stimulus = [];
    this.stimulusCicle = signalDuration + pauseDuration;
    this._resetStimuli();
    this.index = 0;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read() {
    setTimeout(() => {
      this.stimulus = [
        new Date().getTime(),
        this.idarray[this.index]
      ];
      // this.push(JSON.stringify(this.stimulus));//+`\r\n`
      this.push(this.stimulus);
      if (this.index++ === this.idarray.length - 1) {
        this._resetStimuli();
      }
    }, this.stimulusCicle);
  }
  
  _resetStimuli() {
    this.index = 0;
    return this.idarray.sort(() => { return Math.random() - 0.5; });//randomize idarray order
  }
}

if(module.parent)
  module.exports = Stimuli;
else {
  // s.pipe(tcp);//
  // OR
  // to pipe into process.stdout JSON.stringify this.stimulus in this._read() first
  // let s = new Stimuli();
  // s.pipe(process.stdout);
}
