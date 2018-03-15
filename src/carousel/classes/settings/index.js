"use strict";

const
  Window = require('../window')
  , {Tools} = require('mbeeg')
;

class Settings extends Window {
  constructor({
                colorScheme
              }) {
    super({colorScheme});
    this.colorScheme = Tools.copyObject(colorScheme);
  }
  
}

module.exports = Settings;