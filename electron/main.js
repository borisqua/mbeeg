'use strict';

// const pug = require('pug');
const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let ebmlLogWindow;
let carouselWindow;
let settingsWindow;

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 300,
    height: 300,
    parent: mainWindow,
    frame: false,
    show:false
  });
  
  settingsWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index2.html'),
    protocol: 'file',
    shashes: true
  }));
  
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });
  
}

function createWindow() {
  mainWindow = new BrowserWindow({
    backgroundColor: '#e5e5e5',
    width: 600,
    height: 600,
    fullscreen: false,
    frame: true,
    show: false,
    resizable: true
  });
  
  // mainWindow.
  mainWindow.loadURL(url.format({
    pathname:  path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  
   mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // mainWindow.webContents.openDevTools();
  
  mainWindow.on('closed', ()=>{
    mainWindow = null;
  });
  
}

app.on('ready', ()=>{
  createWindow();
  createSettingsWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createSettingsWindow();
    createWindow();
  }
});

