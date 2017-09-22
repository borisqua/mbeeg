"use strict";

class Signal {
  constructor({
                starttime = 0
                , samplingRate = 0
                , signal = {matrix: {dimensions: [[]]}}
                , channelUnits = {matrix: {dimensions: [[]]}}
              }) {
    
    this.starttime = 0;
    this.samplingRate = samplingRate;
    this.signal = signal;
    this.channelUnits = channelUnits;
  }
}

module.exports = Signal;
