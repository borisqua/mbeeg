'use strict';

module.exports = {
  
  EBMLReader: require('./ebml/reader')
  , OVReader: require('./openvibe/reader')
  , Stimuli: require('./tools/index').Stimuli
  , DSProcessor: require('./dsprocessor/index')
  , EpochsProcessor: require('./epprocessor/index')
  , Classifier: require('./classifier/index')
  , DecisionMaker: require('./decisionmaker/index')
  , Tools: require('./tools/index').Tools
  , Stringifier: require('./tools/index').Stringifier
  , Objectifier: require('./tools/index').Objectifier
  , NTVerdictStringifier: require('./tools/index').NTVerdictStringifier
  , NTStimuliStringifier: require('./tools/index').NTStimuliStringifier
  , Channels: require('./tools/index').Channels
  
};
