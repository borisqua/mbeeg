"use strict";
const
  {Tools, Controller} = require('mbeeg')
  , config = Tools.loadConfiguration(`../../config.json`)
  , mbeeg = new Controller({
    stimulationParameters: {
      nextSequence: arr => {
        let last = arr[arr.length - 1];
        arr.sort(() => Math.random() - 0.5);
        return arr[0] === last ? arr.push(arr.shift()) : arr;
      }
    },
    decisionParameters: {
      // method: Tools.majorityDecision
      // , parameters: config.mbeeg.decision.methods.majority
      method: Tools.nInARowDecision
      , parameters: config.mbeeg.decision.methods.nInARow
    },
    classifierParameters: {
      method: Tools.absIntegral
      , parameters: config.mbeeg.classification.methods.absIntegral
      , postprocessing: Tools.normalizeVectorBySum
    }
  })
;
