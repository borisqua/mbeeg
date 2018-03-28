"use strict";

const
  {Stimuli, Stringifier, Tools} = require('mbeeg')
  , plainStringifier = new Stringifier({
    chunkEnd: `\r\n`
  })
  , config = Tools.loadConfiguration(`../../config.json`)
  , stimuli = new Stimuli({ //should pipe simultaneously to the epochs and to the carousel
    duration: config.mbeeg.stimulation.duration
    , pause: config.mbeeg.stimulation.pause
    , stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli
    , pauseBetweenCycles: config.mbeeg.stimulation.pauseBetweenCycles
    , nextSequence: arr => {
      let last = arr[arr.length - 1];
      arr.sort(() => Math.random() - 0.5);
      return arr[0] === last ? arr.push(arr.shift()) : arr;
    }
  })
;

setTimeout(() => {
  stimuli.unbind();
  console.log(`stimuli is paused`)
}, 5000);
setTimeout(() => {
  stimuli.bind();
  console.log(`stimuli is resumed`);
}, 10000);
setTimeout(() => {
  let delay = 5000;
  stimuli.delay(delay);
  console.log(`stimuli is set on delay of ${delay}`);
}, 15000);
stimuli.on('error', (err) => {console.log(`error ${err} in stimuli`)}).pipe(plainStringifier).on('error', () => {console.log(`error in stringifier`)}).pipe(process.stdout).on('error', () => {console.log(`error in stringifier`)});

// setTimeout(() => {
//   console.log(`exit by timeout`);
//   process.exit(0);
// }, 11000);

