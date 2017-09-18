"use strict";
const {Readable} = require(`stream`);

class Stimuli extends Readable {
  constructor({signalDuration = 130, pauseDuration = 170, learning = false, objectMode= true }) {
    super({objectMode});
    this.idarray = [...new Array(33).keys()];
    this.stimulus = [];
    this.stimulusCicle = signalDuration + pauseDuration;
    this.learning = learning;
    this._resetStimuli();
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read() {
    setTimeout(() => {
      this.stimulus = [
        new Date().getTime(),
        this.idarray[this.currentStimulus],
        !this.learning ? null : Math.random() > 0.1 //target field = in learning mode - true if target key, false if not, and null in online mode
      ];
      // this.push(JSON.stringify(this.stimulus));//+`\r\n`
      this.push(this.stimulus);
      if (this.currentStimulus++ === this.idarray.length - 1) {
        this._resetStimuli();
      }
    }, this.stimulusCicle);
  }
  
  _resetStimuli() {
    this.currentStimulus = 0;
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
