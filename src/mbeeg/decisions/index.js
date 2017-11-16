"use strict";
const log = require('debug')('mbeeg:Decisions');

class Decisions extends require('stream').Transform {
  constructor({
                start = 3
                , cycles = 10
                , threshold = 5
                // method// = `majority`//SGD
                // , methodParameters
              }) {
    super({objectMode: true});
    this.start = start;
    this.queueMaxLength = cycles;
    this.decisionThreshold = threshold;
    this._reset();
  }
  
  _reset() {
    this.winnersQueue = [];
    this.winnersSeriesLength = 1;
    this.overallCounter = 0;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, cb) {
    let verdicts = require('mbeeg').Tools.copyObject(chunk);
    for (let verdict of verdicts)
      if (++this.overallCounter >= this.start) {
        log(`                ::inner overall counter is ${this.overallCounter}`);
        this.result = verdict;
        // noinspection JSUnusedAssignment
        this.winnersQueue.push(this.result.reduce((ac, v, i, ar) =>
          ar[ac] === undefined || ar[ac] < v ? ac = i : ac, 0));//idx of max
        log(`                ::winners queue [${this.winnersQueue}]`);
        if (this.winnersQueue[this.winnersQueue.length - 1] === this.winnersQueue[this.winnersQueue.length - 2]) {
          if (++this.winnersSeriesLength >= this.decisionThreshold) {
            log(`                ::NextDecisionReady - winner id = ${this.winnersQueue[this.winnersQueue.length - 1]}`);
            cb(null, this.winnersQueue[this.winnersQueue.length - 1]);
            this._reset();
            return;
          }
        } else {
          this.winnersSeriesLength = 1;
        }
        if (this.overallCounter - this.start + 1 >= this.queueMaxLength) {
          log(`                ::DecisionFailed - winner id = -1`);
          // this.emit('decision', )
          cb(null, -1);
          this._reset();
          return;
        }
      } else
        log(`                ::Start cycle is not reached yet, no winner, go to next cycle --`);
    cb();
  }
}

// function SGD({verdict, start = 2, cycles = 10, threshold = 5, startweights = 1, startgradient = 0}) {
//   if (reset) {
//     let
//       weights = new Array(verdict.length).fill(startweights)
//       , gradients = new Array(verdict.length).fill(startgradient)
//     ;
//   }
//   this.weights = this.weights.map((e, i) => e * this.grad[i]);
//   this.result = verdict.map((e, i) => e * this.weights[i]);
//   this.grad = verdict;
// }

module.exports = Decisions;
