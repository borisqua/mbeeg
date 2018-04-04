"use strict";
// require('electron-debug');
const
  appRoot = require(`app-root-path`)
  , {app, BrowserWindow, Menu, ipcMain, webContents, globalShortcut} = require('electron')
  , template = require(`${appRoot}/src/app/menu`)
  , ipcController = require(`child_process`).fork(`${appRoot}/src/core/controller/index.js`)
;

let winMain, winKeyboard, winConsole,//winDebuggerLog;// Keep a global reference of the windows objects, if you don't, the window will be closed automatically when the JavaScript object is garbage collected.
  menuTemplate = Menu.buildFromTemplate(template),
  forceCloseApp = false;

function createWindows() {
  const window = require(`${appRoot}/src/app/window`);
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
    // frame: false,
    // resizable: false,
    url: 'gui/keyboard/index.html'
  });
  // winKeyboard.setMenu(null);
  winKeyboard.on(`show`, e => {
    ipcController.send(`start-stimuli`);
    ipcController.send(`start-P300-recognition`);
  });
  
  winKeyboard.on(`close`, e => {
    if (!forceCloseApp) {
      e.preventDefault();
      winKeyboard.hide();
      ipcController.send(`stop-stimuli`);
      ipcController.send(`stop-P300-recognition`);
      winMain.focus();
    }
  });
  
  winConsole = window({
    width: 900,
    height: 400,
    // parent: winMain,
    show: false,
    url: "gui/console/index.html"
  });
  // winConsole.setMenu(null);
  winConsole.on(`close`, (e) => {
    if (!forceCloseApp) {
      e.preventDefault();
      winConsole.hide();
      //controller.saveConfiguration()
      winMain.focus();
    }
  });
  
}

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
  ipcController.on(`message`,
    message => {
      switch (message) {
        case verdict:
          break;
        case `ipc-controller-listen`:
          console.log(message);
        default:
          console.log(message);
      }
    });
  createWindows();
  
  globalShortcut.register(`CommandOrControl+W`, () => {
    BrowserWindow.getFocusedWindow().close();
  });
  globalShortcut.register(`CommandOrControl+Shift+K`, () => {
    winKeyboard.show();
    // winKeyboard.show();
    // ipcController.send(`start-stimuli`);
    // ipcController.send(`start-P300-recognition`);
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
        winKeyboard.show();
        // winKeyboard.show();
        // ipcController.send(`start-stimuli`);
        // ipcController.send(`start-P300-recognition`);
        break;
      case 'console-launch':
        winConsole.show();
        break;
    }
  })
  .on(`ipcConsole-command`, (e, arg) => {
    winKeyboard.webContents.send(`ipcConsole-command`, arg);
  });


