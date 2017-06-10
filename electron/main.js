'use strict';

// const pug = require('pug');
const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let ebmlLogWindow;
let carouselWindow;
let settingsWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    fullscreen: false,
    frame: true,
    show: true,
    resizable: true
  });
  
  // let compiledPug = pug.compileFile('index.pug');
  
  // mainWindow.
  mainWindow.loadURL(url.format({
    pathname:  path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  // mainWindow.webContents.openDevTools();
  
  mainWindow.on('closed', ()=>{
    mainWindow = null;
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

