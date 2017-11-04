"use strict";
//TODO why DSVProcessor modifies stream from incoming pipe
class DSProcessor extends require('stream').Transform {
  constructor({
                action = () => {}
                , actionParameters = {}
                , objectMode = true
              }) {
    super({objectMode: true});
    this.objectMode = objectMode;
    this.action = action;
    this.actionParameters = actionParameters;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    // let epoch = Object.assign({}, chunk);
    console.log(`--DEBUG::    DSProcessor::Epoch-${this.action.name}--Key=${epoch.key} Epoch number=${epoch.number}`);
    for (let i = 0, channelsNumber = epoch.channels.length; i < channelsNumber; i++) {
      this.actionParameters.timeseries = epoch.channels[i];
      this.actionParameters.samplingrate = epoch.samplingRate;
      epoch.channels[i] = this.action(this.actionParameters);//TODO consider adding try catch
      epoch.state = this.action.name;
    }
    if (this.objectMode)
      cb(null, epoch);//For output into objectType pipe
    else
      cb(null, JSON.stringify(epoch, null, 2)); //For output into process.stdout (and maybe TCP)
  }
}

module.exports = DSProcessor;
