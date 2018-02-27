"use strict";
const EventEmitter = require('events');

class Content extends EventEmitter {
  constructor({
                colorScheme
              }) {
    super();
    this.reloadScheme(colorScheme);
  }
  
  reloadScheme(colorScheme) {
    
    let html = $('html');
    
    switch (colorScheme) {
      case `dark`:
        html.removeClass("light");
        html.addClass("dark");
        break;
      case `light`:
        html.removeClass("dark");
        html.addClass("light");
        break;
    }
    
  }
  
}

module.exports = Content;
