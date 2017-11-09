"use strict";

class DSVProcessor extends require('stream').Transform {
  constructor({
                action = () => {}
                , actionParameters = {}
              }) {
    super({objectMode: true});
    this.action = action;
    this.actionParameters = actionParameters;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, cb) {
    let epoch = require('mbeeg').Tools.copyObject(chunk);
    console.log(`--DEBUG::      DSVProcessor::Epoch-${this.action.name}--Key=${epoch.key} Epoch number=${epoch.number}`);
    for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
      this.actionParameters.timeseries = epoch.channels[i];
      this.actionParameters.samplingrate = epoch.samplingRate;
      epoch.channels[i] = this.action(this.actionParameters);//TODO consider adding try catch
      epoch.state = this.action.name;
    }
    cb(null, epoch);//For output into objectType pipe
  }
}

module.exports = DSVProcessor;
