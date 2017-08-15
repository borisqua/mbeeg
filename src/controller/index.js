"use strict";
const
  DSProcessor = require(`../dsprocessor`),
  Keyboard = require(`./keyboard`),
  Classifier = require(`../classifier`);

class Controller {
  constructor({
                stimuli, eeg,
                learning = false
              }) {
    this.keyboard = new Keyboard();
    if (learning) {
      //preparing data for learning according to learning policy from file learning.json
      // first - save raw epochs data with targets (see
      // second - vary preprocessing parameters as it prescribed in learning.json file
      // third - write resulting stream to _transform callback writable
      const fs = require(`fs`);
      this.learning = JSON.parse(fs.readFileSync(`../learning.json`));
    } else {
      //
    }
    
  }
  
  run({learning = false}){
    this.dsprocessor = new DSProcessor({stimuli, eeg, learning: true});
    this.classifier = new Classifier({});
  }
  
}

module.exports = Controller;
