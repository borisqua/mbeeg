"use strict";

class Stimuli extends require(`stream`).Transform {
  constructor({
                objectMode = true,
                learning = false,
                learningCycleDuration = 0,
                stimuliArray = [],
                learningArray = stimuliArray,
                signalDuration = 0,
                pauseDuration = 0,
                nextSequence = arr => {
                  return arr.sort(() => {
                    return Math.random() - 0.5;
                  })
                },
                nextTarget = (arr, previousTarget) => {
                  return arr.length - 1 ? 0 : previousTarget++;
                }
              }) {
    super({objectMode: true});
    this.idarray = stimuliArray.slice();
    this.stimulus = [];
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.stimulusCicle = signalDuration + pauseDuration;
    this.objectMode = objectMode;
    this.learning = learning;
    this.learningDuration = learningCycleDuration;
    this.currentLearningCycle = 0;
    this.learningArray = learningArray;
    this._nextSequence = nextSequence;
    this._nextTarget = nextTarget;
    
    this._resetStimuli();
  }
  
  _resetStimuli() {
    this.currentStimulus = 0;
    return this._nextSequence(this.idarray); //randomize idarray order
  }
  
}

class Transform extends Stimuli {
  constructor(options) {
    super(options);
  }
  
  // noinspection JSUnusedGlobalSymbols
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

class Readable extends Stimuli {
  constructor(options) {
    super(options);
  }
  
  _read(size) {
    setTimeout(() => {
      
      this.stimulus = [
        new Date().getTime(),
        this.idarray[this.currentStimulus],
        !this.learning ? null : Math.random() > 0.1 //target field = in learning mode - true if target key, false if not, and null in online mode
      ];
      
      if (this.objectMode) this.push(this.stimulus);
      else this.push(`${JSON.stringify(this.stimulus)}\n`);
      
      if (this.currentStimulus++ === this.idarray.length - 1) {
        this._resetStimuli();
        if (this.learning && this.currentLearningCycle > this.learningDuration - 1)
          this._nextTarget(this.learningArray, this.currentLearningCycle);
      }
    }, this.stimulusCicle);
  }
}

module.exports = {Transform: Transform, Readable: Readable};
