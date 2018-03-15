"use strict";
const EventEmitter = require('events');

class Window extends EventEmitter {
  /**
   * @param colorScheme - object literal with available color schemes properties
   */
  constructor({
                colorScheme
              }) {
    super();
    $('html').css({background: `${colorScheme.available[colorScheme.selected]['background']}`});
  }
  
  // noinspection JSMethodCanBeStatic
  reloadScheme(colorScheme) {
    $('html').css({background: `${colorScheme.available[colorScheme.selected]['background']}`});
  }
  
}

module.exports = Window;
