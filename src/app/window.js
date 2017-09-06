"use strict";
const {BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

function window(options = {}) {
  
  let win = new BrowserWindow({
    width: options.width,
    height: options.height,
    frame: options.frame,
    parent: options.parent,
    resizable: options.resizable,
    show: options.show
  });
  
  // and load the html file for the window.
  win.loadURL(url.format({
    pathname: path.join(__dirname, options.url),
    protocol: 'file:',
    slashes: true
  }));
  
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

return win;
}

module.exports = window;
