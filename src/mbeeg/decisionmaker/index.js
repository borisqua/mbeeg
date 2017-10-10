"use strict";
const
  Matrix = require('ml-matrix')
;

class DecisionMaker extends require('stream').Transform {
  constructor({
                start = 2
                , maxLength = 5//12
                , decisionThreshold = 2//3
                , method = `majority`//SGD
              }) {
    super({objectMode: true});
    this.start = start;
    this.queueMaxLength = maxLength;
    this.decisionThreshold = decisionThreshold;
    this.method = method;
    this._reset();
  }
  
  _reset() {
    this.w = [1, 1, 1, 1];
    this.grad = [0, 0, 0, 0];
    this.winnersQueue = [];
    this.winnersSeriesLength = 1;
    this.overallCounter = 0;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(verdict, encoding, cb) {
    if (++this.overallCounter >= this.start) {
      switch (this.method) {
        case `SGD`:
          this.w = Matrix.add(this.w, Matrix.mmul(this.w, this.grad));
          this.result = Matrix.mmul(verdict, this.w);
          this.grad = verdict;
          break;
        default:
          this.result = verdict;
      }
      this.winnersQueue.push(this.result.reduce((ac, v, i, ar) => ar[ac] < v ? ac = i : ac, 0));//idx of max
      console.log(this.winnersQueue);
      if (this.winnersQueue[this.winnersQueue.length - 1] === this.winnersQueue[this.winnersQueue.length - 2]) {
        if (++this.winnersSeriesLength >= this.decisionThreshold) {
          cb(null, this.winnersQueue[this.winnersQueue.length - 1]);
          this._reset();
          return;
        }
      } else {
        this.winnersSeriesLength = 1;
      }
      if (this.overallCounter - this.start + 1 >= this.queueMaxLength) {
        this._reset();
      }
    }
    cb();
  }
}

module.exports = DecisionMaker;
