'use strict';

module.exports = {
  
  EBMLReader: require('./ebml/reader')
  , OVReader: require('./openvibe/reader')
  , Stimuli: require('./tools').Stimuli
  , DSProcessor: require('./dsprocessor')
  , EpochsProcessor: require('./epprocessor')
  , Classifier: require('./classifier')
  , DecisionMaker: require('./decisionmaker')
  , Tools: require('./tools').Tools
  , Stringifier: require('./tools').Stringifier
  , Objectifier: require('./tools').Objectifier
  , NTVerdictStringifier: require('./tools').NTVerdictStringifier
  , NTStimuliStringifier: require('./tools').NTStimuliStringifier
  , Channels: require('./tools').Channels
  
};
