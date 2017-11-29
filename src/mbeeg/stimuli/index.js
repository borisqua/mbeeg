"use strict";

class Stimuli extends require('stream').Readable {
  constructor({
                learning = false,
                learningCycleDuration = 0,
                stimuliIdArray = [],
                learningArray = stimuliIdArray,
                signalDuration = 0,
                pauseDuration = 0,
                nextSequence = arr => {
                  return arr.sort(() => {
                    return Math.random() - 0.5;
                  })
                },
                nextTarget = (arr, previousTarget, learningCycle) => {//todo learning mode
                  if (++previousTarget > arr.length - 1) {
                    // previousTarget = 0;
                    // learningCycle = 0;
                    return 0;
                  }
                  else {
                    learningCycle++;
                    return previousTarget;
                  }
                }
              }) {
    super({objectMode: true});
    this.stimuliIdArray = stimuliIdArray.slice();
    this.stimulus = [];
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.stimulusCycleDuration = signalDuration + pauseDuration;
    this.stimulusCycle = -1;
    this.currentStimulus = 0;
    this.learning = learning;
    this.learningDuration = learningCycleDuration;
    this.currentLearningCycle = 0;
    this.learningArray = learningArray;
    this.currentTargetStimulus = 0;
    this._nextSequence = nextSequence;
    this._nextTarget = nextTarget;
    
    this._resetStimuli();
  }
  
  reset({stimuliIdArray, stimulusDuration, pauseDuration}) {
    this.stimuliIdArray = stimuliIdArray.slice();
    this.signalDuration = stimulusDuration;
    this.pauseDuration = pauseDuration;
    this.stimulusCycle = -1;
    this._resetStimuli();
  }
  
  stimuliIdArray() {
    return this.stimuliIdArray;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read(size) {
    // console.log(`--DEBUG::Stimuli::NextStimulus--`);
    setTimeout(() => {
      
      this.stimulus = [
        new Date().getTime()
        , this.stimuliIdArray[this.currentStimulus]
        , this.learning && this.currentStimulus === this.currentTargetStimulus ? 1 : 0 //target field = in learning mode - true if target key, false if not, and null in online mode
        , this.stimulusCycle//todo consider problems with cycles counting from stimuli/samples to classification/decision levels
      ];
  
      this.push(this.stimulus);
      
      this._checkCycles();
      
    }, this.stimulusCycleDuration);
  }
  
  _resetStimuli() {
    this.stimulusCycle++;
    this.currentStimulus = 0;
    return this._nextSequence(this.stimuliIdArray); //randomize idarray order
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
