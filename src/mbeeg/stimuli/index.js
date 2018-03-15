"use strict";
//todo>> experiment what if replace old stimuli instance with new one instead of use "bound/unbound" methods

class Stimuli extends require('stream').Readable {
  constructor({
                duration,
                pause,
                pauseBetweenCycles = 0,
                stimuliIdArray,
                learning = false,
                learningCycleDuration = 0,
                learningArray = stimuliIdArray,
                nextSequence = arr => arr.sort(() => Math.random() - 0.5),
                nextTarget = (arr, previousTarget, learningCycle) => {//todo>> learning mode
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
    // this.stimulusDuration = duration;
    // this.pauseDuration = pause;
    this.pauseBetweenCycles = pauseBetweenCycles;
    this.stimulusCycleDuration = duration + pause;
    this.stimulusCycle = -1;
    this.currentStimulus = 0;
    this.learning = learning;
    this.learningDuration = learningCycleDuration;
    this.currentLearningCycle = 0;
    this.learningArray = learningArray;
    this.currentTargetStimulus = 0;
    this._nextSequence = nextSequence;
    this._nextTarget = nextTarget;
    // this.stimuliScheduled = [];
    
    this.bounded = true;
    this._resetStimuli();
  }
  
  /**
   * restarts stimuli generation process with new stimuliIdArray, new duration of each stimulus and pause
   * @param stimuliIdArray
   * @param duration
   * @param pause
   */
  reset({stimuliIdArray, duration, pause}) {
    this.stimuliIdArray = stimuliIdArray.slice();
    // this.stimulusDuration = duration;
    // this.pauseDuration = pause;
    this.stimulusCycleDuration = duration + pause;
    this._reset();
  }
  
  _reset() {
    this.stimulusCycle = -1;
    this._resetStimuli();
  }
  
  /**
   * returns reference on stimuliIdArray property of stimuli generator
   * @return {Stimuli.stimuliIdArray}
   */
  stimuliIdArray() {
    return this.stimuliIdArray;
  }
  
  delay(duration) {
    this.bounded = false;
    // this._clearTimeouts();
    setTimeout(() => {
      this._reset();
      this.bounded = true;
    }, duration);
  }
  
  bound() {
    this._reset();
    this.bounded = true;
  }
  
  unbound() {
    this.bounded = false;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read(size) {
    // console.log(`--DEBUG::Stimuli::NextStimulus--`);
    // this.stimulusScheduled = push(
    setTimeout(() => {
      
      this.stimulus = [
        this.bounded ? new Date().getTime() : 0
        , this.stimuliIdArray[this.currentStimulus]
        , this.learning && this.currentStimulus === this.currentTargetStimulus ? 1 : 0 //target field = in learning mode - true if target key, false if not, and null in online mode
        , this.stimulusCycle//todo>> consider problems with cycles counting from stimuli/samples to classification/decision levels
      ];
      
      this.push(this.stimulus);
      
      this._checkCycles();
      
    }, this.currentStimulus === this.stimuliIdArray.length - 1 ? this.stimulusCycleDuration + this.pauseBetweenCycles : this.stimulusCycleDuration);
  }
  
  _resetStimuli() {
    this.stimulusCycle++;
    this.currentStimulus = 0;
    return this._nextSequence(this.stimuliIdArray); //randomize idarray order
  }
  
  /**
   * reset next stimuli sequence and select next target if learning mode
   * @private
   */
  _checkCycles() {
    if (this.currentStimulus++ === this.stimuliIdArray.length - 1) {
      this._resetStimuli();
      if (this.learning && this.currentLearningCycle > this.learningDuration - 1)
        this._nextTarget(this.learningArray, this.currentTargetStimulus, this.currentLearningCycle);
    }
  }
  
}

module.exports = Stimuli;
