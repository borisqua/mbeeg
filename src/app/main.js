"use strict";
require('electron-debug');
const util = require('util');
const {app, Menu} = require('electron');
const template = require('./menu');
const menu = Menu.buildFromTemplate(template);

// Keep a global reference of the windows objects, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let winMain, winCarousel;//, winConsole, winDebuggerLog;

function createWindows() {
  const window = require('./window');
  Menu.setApplicationMenu(menu);
  
  winMain = window({
    width: 800,
    height: 600,
    show: false,
    url: "./index.html"
  });
  
  winCarousel = window({
    width: 800,
    height: 600,
    show: false,
    url: '../carousel/index.html'
  });
  
  // winConsole = window({
  //   width: 800,
  //   height: 600,
  //   show: false,
  //   url: 'index.html'
  // });
  //
  // winDebuggerLog = window({
  //   width: 800,
  //   height: 600,
  //   show: false,
  //   url: 'index.html'
  // });

  // Show main window when all windows fully initialized
  winMain.on('ready-to-show', () => {
    winMain.show();
  });
  
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindows);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (winMain === null) {
    createWindows()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.