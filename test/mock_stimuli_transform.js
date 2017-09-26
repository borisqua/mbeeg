"use strict";

class Stimuli extends require(`stream`).Transform {
  constructor({
                objectMode = true,
                signalDuration = 0,
                pauseDuration = 0
              }) {
    super({objectMode: true});
    this.signalDuration = signalDuration;
    this.pauseDuration = pauseDuration;
    this.stimulusCycleDuration = signalDuration + pauseDuration;
    this.objectMode = objectMode;
    
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(stimulus, encoding, cb) {
    //first field of sample vector always contains timestamp
    setTimeout(() => {
      
      if (this.objectMode) cb(null, [+stimulus[0], +stimulus[1], +stimulus[2]]);
      else cb(null, `${JSON.stringify([+stimulus[0], +stimulus[1], +stimulus[2]])}\n`);
      
    }, this.stimulusCycleDuration);
  }
  
}

module.exports = Stimuli;
