"use strict";
const
  appRoot = require(`app-root-path`),
  stimuliCSV = require(`csv-streamify`)({objectMode: true}),
  eegCSV = require(`csv-streamify`)({objectMode: true}),
  EEG = require(`${appRoot}/src/core/dsprocessor/eeg.js`),
  Stimuli = require(`${appRoot}/src/core/dsprocessor/stimuli.js`),
  DSProcessor = require(`${appRoot}/src/core/dsprocessor`),
  EpochsProcessor = require(`${appRoot}/src/core/epprocessor`),
  Classifier = require(`${appRoot}/src/core/classifier`),
  Helpers = require(`${appRoot}/src/tools/helpers`),
  fs = require(`fs`);

class Controller {
  constructor({
                stimuli, eeg,
                learning = false
              }) {
    this.eeg = new EEG({
      // stringify: true,
      // samplingRate: 250,
      objectMode: true
    });
    
    this.stimuli = new Stimuli({
      // stringify: true,
      // signalDuration: 120,
      // pauseDuration: 230,
      objectMode: true
    });
    
    if (learning) {
      //preparing data for learning according to learning policy from file learning.json
      // first - save raw epochs data with targets (see
      // second - vary preprocessing parameters as it prescribed in learning.json file
      // third - write resulting stream to _transform callback writable
      // this.learning = JSON.parse(fs.readFileSync(`../learning.json`));
    } else {//online mode - recognizing and classification
      const epochs = new DSProcessor({
        stimuli, eeg,
        learning: false,
        stimuliNumber: 4,
        epochDuration: 1000,
        samplingRate: 250,
        sequence: `filter, detrend`,
        objectMode: true //set false to output result as string (through process.stdout e.g.); set true to pass js objects
      });
      
      const epochProcessor = new EpochsProcessor({
        epochs,
        moving: false,
        depth: 5,
        stimuliNumber: 4,
        objectMode: true
      });
      
      const classifier = new Classifier({
          objectMode: false
        })
      ;
      
      epochProcessor
        .pipe(classifier)
    }
    
  }
  
  feed() {
  
  }
  
  run({learning = false}) {
    this.dsprocessor = new DSProcessor({stimuli, eeg, learning: true});
    this.classifier = new Classifier({});
  }
  
}

module.exports = Controller;
