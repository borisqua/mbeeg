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
    this.stimuliIdArray = stimuliArray.slice();
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
    this.stimuliIdArray = stimuliIdArray;
    this.signalDuration = stimulusDuration;
    this.pauseDuration = pauseDuration;
    this.generator = generator;
    this.resetCyclesCounter();
  }
  
  resetCyclesCounter() {
    this.stimulusCycle = -1;
    this._resetStimuli();
  }
  
  stimuliArray() {
    return this.stimuliIdArray;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read(size) {
      setTimeout(() => {
        
        this.stimulus = [
          new Date().getTime(),
          this.stimuliIdArray[this.currentStimulus],
          this.learning && this.currentStimulus === this.currentTargetStimulus ? 1 : 0 //target field = in learning mode - true if target key, false if not, and null in online mode
        ];
        
        if (this.objectMode) {
          this.push(this.stimulus)
        } else
          this.push(`${JSON.stringify(this.stimulus)}`);
        
        this._checkCycles();
        
      }, this.stimulusCycleDuration);
  }
  
  _resetStimuli() {
    this.stimulusCycle++;
    this.currentStimulus = 0;
    return this._nextSequence(this.stimuliIdArray); //randomize stimuliIdArray order
  }
  
  _checkCycles() {
    if (this.currentStimulus++ === this.stimuliIdArray.length - 1) {
      this._resetStimuli();
      if (this.learning && this.currentLearningCycle > this.learningDuration - 1)
        this._nextTarget(this.learningArray, this.currentTargetStimulus, this.currentLearningCycle);
    }
  }
  
}

module.exports = Stimuli;
