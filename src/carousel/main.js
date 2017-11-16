"use strict";
const
  {app, BrowserWindow, Menu, ipcMain, globalShortcut} = require('electron')
  , template = require('./menu')
  // , ipcController = require('child_process').fork(`${appRoot}/src/core/controller/index.js`)
;

let winMain, winKeyboard, winConsole //winDebuggerLog;// Keep a global reference of the windows objects, if you don't, the window will be closed automatically when the JavaScript object is garbage collected.
  , menuTemplate = Menu.buildFromTemplate(template)
  , forceCloseApp = false
  , keyboardRuns = false
;

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
    // parent: winMain,
    // frame: false,//production
    // resizable: false,
    url: 'gui/keyboard/index.html'
  });
  // winKeyboard.setMenu(null);//production
  winKeyboard.on(`show`, () => {
    //TODO check if already runs and send message only if not
    if(!keyboardRuns){
      keyboardRuns = true;
      // ipcController.send(`start-stimuli`);
      // ipcController.send(`start-classification`);
    }
  });
  
  winKeyboard.on(`close`, e => {
    if (!forceCloseApp) {
      e.preventDefault();
      winKeyboard.hide();
      keyboardRuns = false;
      // ipcController.send(`stop-stimuli`);
      // ipcController.send(`stop-classification`);
      winMain.focus();
    }
  });
  
  winConsole = window({
    width: 900,
    height: 400,
    // parent: winMain,
    // frame: false,//production
    show: false,
    url: "gui/console/index.html"
  });
  // winConsole.setMenu(null);//production
  winConsole.on(`close`, (e) => {
    if (!forceCloseApp) {
      e.preventDefault();
      winConsole.hide();
      //controller.saveConfiguration()
      winMain.focus();
    }
  });
  
}

// noinspection JSUnusedLocalSymbols
const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (winMain) {
    if (winMain.isMinimized()) winMain.restore();
    winMain.focus();
  }
});
if (isSecondInstance) {
  app.quit();
}

app.on('ready', () => {
  //createAppInfrastructure();
  // ipcController.on(`message`,
  //   msg => {
  //     switch (msg) {
  //       case "verdict":
  //         break;
  //       case "ipc-controller-listen":
  //         console.log(msg);
  //         break;
  //       default:
  //         console.log(msg);
  //     }
  //   });
  createWindows();
  
  globalShortcut.register(`CommandOrControl+W`, () => {
    BrowserWindow.getFocusedWindow().close();
  });
  globalShortcut.register(`CommandOrControl+Shift+K`, () => {
    // if (!winKeyboard.isVisible())
      winKeyboard.show();
  });
  globalShortcut.register(`CommandOrControl+Shift+C`, () => {
    winConsole.show();
    //controller.readConfiguration()
  });
});

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (winMain === null) createWindows();
});

ipcMain
  .on(`ipcRenderer-message`, (e, arg) => {//asynchronous-message
    e.sender.send(`ipcMain-reply`, arg);//asynchronous-reply
    switch (arg) {
      case 'keyboard-launch':
        // winKeyboard.setFullScreen(!winKeyboard.isFullScreen());
        // if (!winKeyboard.isVisible())
          winKeyboard.show();
        break;
      case 'console-launch':
        winConsole.show();
        break;
    }
  })
  .on(`ipcConsole-command`, (e, arg) => {
    winKeyboard.webContents.send(`ipcConsole-command`, arg);
  });

