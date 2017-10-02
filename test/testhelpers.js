"use strict";
const
  {Transform} = require('stream')
  , appRoot = require('app-root-path')
;

class Channels extends Transform {
  constructor({
                keys = []
                , channels = []
              }) {
    super({objectMode: true});
    this.keys = keys;
    this.channels = channels;
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(epoch, encoding, cb) {
    if (!this.keys.length || this.keys.includes(epoch.key)) {
      let result = `Cycle: ${epoch.cycle} - `;
      for (let chN = 0; chN < epoch.channels.length; chN++) {
        if (!this.channels.length || this.channels.includes(chN)) {
          let fieldName = `key${('0' + epoch.key).substr(-2)}::ch${('0' + chN).substr(-2)}`;
          // fields.push({key: +epoch.key, channel: chN, fieldName: fieldName, data: epoch.channels[chN]});
          // data.push({key: +epoch.key, channel: chN, data: epoch.channels[chN]});
          result += `${fieldName}=sum(${epoch.channels[chN].reduce((a, b) => a + b)}) \n`;
        }
      }
      cb(null, result);
    }
  }
}

module.exports = {
  Channels: Channels
};

