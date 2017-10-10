"use strict";

class Stimuli extends require('stream').Transform {
  constructor({
                objectMode = true,
                generator = true,
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
                nextTarget = (arr, previousTarget, learningCycle) => {
                  if (previousTarget++ > arr.length - 1)
                    return previousTarget = learningCycle = 0;
                  else {
                    learningCycle++;
                    return previousTarget;
                  }
                }
              }) {
    super({objectMode: true});
    this.generator = generator;
    this.idarray = stimuliArray.slice();
    this.stimulus = [];
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.stimulusCycleDuration = signalDuration + pauseDuration;
    this.stimulusCycle = -1;
    this.currentStimulus = 0;
    this.objectMode = objectMode;
    this.learning = learning;
    this.learningDuration = learningCycleDuration;
    this.currentLearningCycle = 0;
    this.learningArray = learningArray;
    this.currentTargetStimulus = 0;
    this._nextSequence = nextSequence;
    this._nextTarget = nextTarget;
    
    this._resetStimuli();
  }
  
  resetStimuli({stimuliIdArray, stimulusDuration, pauseDuration, generator = false}) {
    this.idarray = stimuliIdArray;
    this.signalDuration = stimulusDuration;
    this.pauseDuration = pauseDuration;
    this.generator = generator;
    this.resetCyclesCounter();
  }
  
  runGenerator() {
    this.generator = true;
  }
  
  stopGenerator() {
    this.generator = false;
  }
  
  resetCyclesCounter() {
    this.stimulusCycle = -1;
    this._resetStimuli();
  }
  
  stimuliArray() {
    return this.idarray;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(stimulus, enconding, cb) {
    if (this.generator) {
      setTimeout(() => {
        this.stimulus = [
          new Date().getTime(),
          this.idarray[this.currentStimulus],
          this.learning && this.currentStimulus === this.currentTargetStimulus ? 1 : 0 //target field = in learning mode - true if target key, false if not, and null in online mode
        ];
        if (this.objectMode) {
          cb(null, this.stimulus);
        } else
          cb(null, `${JSON.stringify(this.stimulus)}`);
        
        this._checkCycles();
      }, this.stimulusCycleDuration);
    } else if (this.objectMode) {
      cb(null, stimulus);
    } else {
      cb(null, `${JSON.stringify(stimulus)}`);
    }
  }
  
  _resetStimuli() {
    this.stimulusCycle++;
    this.currentStimulus = 0;
    return this._nextSequence(this.idarray); //randomize idarray order
  }
  
  _checkCycles() {
    if (this.currentStimulus++ === this.idarray.length - 1) {
      this._resetStimuli();
      if (this.learning && this.currentLearningCycle > this.learningDuration - 1)
        this._nextTarget(this.learningArray, this.currentTargetStimulus, this.currentLearningCycle);
    }
  }
  
}

module.exports = Stimuli;
