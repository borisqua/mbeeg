"use strict";

const
  Content = require('../content');

class Settings extends Content {
  constructor({
                colorScheme
              }) {
    super({colorScheme});
    this.colorScheme = colorScheme;
  }
  
}

module.exports = Settings;