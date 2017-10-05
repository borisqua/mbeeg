"use strict";

class Stimuli extends require('stream').Transform {
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
  
  // noinspection JSUnusedGlobalSymbols
  _read(size) {
    setTimeout(() => {
      
      this.stimulus = [
        new Date().getTime(),
        this.idarray[this.currentStimulus],
        this.learning && this.currentStimulus === this.currentTargetStimulus ? 1 : 0 //target field = in learning mode - true if target key, false if not, and null in online mode
      ];
      
      if (this.objectMode) {
        this.push(this.stimulus);
      } else
        this.push(`${JSON.stringify(this.stimulus)}\r\n`);
      
      this._checkCycles();
    }, this.stimulusCycleDuration);
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

