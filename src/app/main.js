"use strict";
// require('electron-debug');
const
  util = require('util'),
  {app, Menu, ipcMain, globalShortcut} = require('electron'),
  template = require('./menu');

// Keep a global reference of the windows objects, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let winMain, winKeyboard, winConsole,//, winConsole, winDebuggerLog;
  menuTemplate = Menu.buildFromTemplate(template),
  forceCloseApp = false,
  focudeWindow;

function createWindows() {
  const window = require('./window');
  // Menu.setApplicationMenu(menu);
  
  winMain = window({
    width: 800,
    height: 600,
    show: false,
    url: "./index.html"
  });
  winMain.on(`close`, () => {
    forceCloseApp = true;
    app.quit();
  });
  winMain.setMenu(menuTemplate);
  winMain.on('ready-to-show', () => {
    winMain.show();
  });
  
  winKeyboard = window({
    width: 1700,
    height: 700,
    show: false,
    parent: winMain,
    frame: false,
    url: 'gui/keyboard/index.html'
  });
  // winKeyboard.setMenu(null);
  winKeyboard.on(`close`, (e) => {
    if (!forceCloseApp) {
      e.preventDefault();
      winKeyboard.hide();
      winMain.focus();
    }
  });
  
  winConsole = window({
    width: 700,
    height: 400,
    parent: winMain,
    show: false,
    url: "./console/index.html"
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  globalShortcut.register(`CommandOrCtrl+W`, () => {
    focusedWindow.hide();
  });
  createWindows();
});
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
  if (winMain === null) createWindows();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on(`asynchronous-message`, (e, arg) => {
  e.sender.send(`asynchronous-reply`, arg);
  switch (arg) {
    case 'keyboard-launch':
      // winKeyboard.setFullScreen(!winKeyboard.isFullScreen());
      winKeyboard.show();
      break;
    case 'console-launch':
    
  }
});


