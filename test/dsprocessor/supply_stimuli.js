"use strict";
const {Readable} = require(`stream`);

class Stimuli extends Readable {
  constructor(stimulusDuration = 130, stimulusPause = 170, options = { objectMode: true }) {
    super(options);
    this.idarray = [...new Array(33).keys()];
    this.stimulus = [];
    this.stimulusCicle = stimulusDuration + stimulusPause;
    this._resetStimuli();
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read() {
    setTimeout(() => {
      this.stimulus = [
        // process.hrtime()[0]*1000000000+process.hrtime()[1],
        new Date().getTime(),
        this.idarray[this._randomizeStimuli.index]
      ];
      this.push(JSON.stringify(this.stimulus));//+`\r\n`
      // this.push(this.stimulus);
      if (this._randomizeStimuli.index++ === this.idarray.length - 1) {
        this._resetStimuli();
      }
    }, this.stimulusCicle);
  }
  
  _randomizeStimuli() {
    let temp = this.idarray.slice(0);
    for (let i = 0; i < this.idarray.length; i++) {
      let index = parseInt(Math.random() * temp.length);
      this.idarray[i] = temp[index];
      temp.splice(index, 1);
    }
  }
  _resetStimuli() {
    this._randomizeStimuli.index = 0;
    this._randomizeStimuli();
  }
}

module.exports = Stimuli;
// let s = new Stimuli();
// s.pipe(process.stdout);
