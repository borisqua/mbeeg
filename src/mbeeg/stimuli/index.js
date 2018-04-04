"use strict";

//todo>> experiment - what if replace old stimuli instance with new one instead of use "bind/unbind" methods

/**
 * class "Stimuli" describes generator of stimuli and process of stimuli generation
 */
class Stimuli extends require('stream').Readable {
  /**
   * @param duration - duration of single stimulus in ms
   * @param pause - duration of pause between two adjacent stimuli in ms
   * @param pauseBetweenCycles - pauseBetweenCycles - duration of pause between two adjacent cycles of stimuli in ms (cycle is one whole sequence as described by stimuliIdArray parameter)
   * @param stimuliIdArray - array with some id of stimuli that describes a sequence of stimuli appearance
   * @param bound - flag that indicates if timestamp biding is required (default - true)
   * @param learning - flag that indicates if learning mode is required (default - false).
   *        In learning mode instance of Stimuli class generate also information about a target element in each sequence
   * @param learningCycleDuration - quantity of stimuli cycles from start to end in learning mode
   * @param learningArray - learningArray - learning sequence of stimuli id (available in stimuliIdArray)
   * @param nextSequence - a callback function that generates new order in stimuliIdArray once the current cycle of stimuli is finished
   * @param nextTarget - a callback function that returns stimulus id of the next target once current learning cycle is finished
   */
  constructor({
                duration,
                pause,
                pauseBetweenCycles = 0,
                stimuliIdArray,
                bound = true,
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
    this.bound = bound;
    this.learning = learning;
    this.learningDuration = learningCycleDuration;
    this.currentLearningCycle = 0;
    this.learningArray = learningArray;
    this.currentTargetStimulus = 0;
    this._nextSequence = nextSequence;
    this._nextTarget = nextTarget;
    // this.stimuliScheduled = [];
    
    this._resetStimuli();
    if(!this.bound){
      this.unbind();
    }
  }
  
  /**
   * getter for a bound flag that indicates if stimuli are bound with timestamps
   * @return {*|boolean}
   */
  get isBound(){
    return this.bound;
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
    return this;
  }
  
  _reset() {
    this.stimulusCycle = -1;
    this._resetStimuli();
    return this;
  }
  
  /**
   * returns reference on stimuliIdArray property of stimuli generator
   * @return {Stimuli.stimuliIdArray}
   */
  stimuliIdArray() {//todo>> declare as getter and check if it works properly
    return this.stimuliIdArray;
  }
  
  delay(duration) {
    this.bound = false;
    // this._clearTimeouts();
    setTimeout(() => {
      this._reset();
      this.bound = true;
    }, duration);
    return this;
  }
  
  bind() {
    this._reset();
    this.bound = true;
    return this;
  }
  
  unbind() {
    this.bound = false;
    return this;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _read(size) {
    // console.log(`--DEBUG::Stimuli::NextStimulus--`);
    // this.stimulusScheduled = push(
    setTimeout(() => {
      
      this.stimulus = [
        this.bound ? new Date().getTime() : 0
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
