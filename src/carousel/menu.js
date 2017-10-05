"use strict";
const
  electron = require('electron'),
  BrowserWindow = electron.BrowserWindow;

let template = [
  {
    label: `&File`
    , id: 'File'
    , submenu: [
    {
      label: `Options...`,
    },
    {
      type: `separator`
    },
    {
      label: `E&xit`
      , accelerator: `Alt+F4`
      , role: 'exit'
      , click: () => {
      electron.app.quit();
    }
    }
  ]
  },
  {
    label: '&Edit'
    , id: `Edit`
    , submenu: [
    {
      label: 'Undo'
      , accelerator: 'CmdOrCtrl+Z'
      , role: 'undo'
    },
    {
      label: 'Redo'
      , accelerator: 'Shift+CmdOrCtrl+Z'
      , role: 'redo'
    },
    {
      type: 'separator'
    },
    {
      label: 'Cut'
      , accelerator: 'CmdOrCtrl+X'
      , role: 'cut'
    },
    {
      label: 'Copy'
      , accelerator: 'CmdOrCtrl+C'
      , role: 'copy'
    },
    {
      label: 'Paste'
      , accelerator: 'CmdOrCtrl+V'
      , role: 'paste'
    },
    {
      label: 'Select All'
      , accelerator: 'CmdOrCtrl+A'
      , role: 'selectall'
    }
  ]
  },
  {
    label: '&View'
    , id: `View`
    , submenu: [
    {
      label: `Carousel`
      , id: `Carousel`
      , click: ()=> {
      
      }
    },
    {
      label: `Console`,
    },
    {
      label: `Debugger log`,
    },
    {
      type: `separator`
    },
    {
      label: 'Reload'
      , accelerator: 'CmdOrCtrl+R'
      , click: (item, focusedWindow) => {
      //on reload start fresh and close any old open secondary window
      if (focusedWindow.id === 1) {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (win.id > 1) {
            win.close();
          }
        });
      }
      focusedWindow.reload();
    }
    },
    {
      label: 'Toggle Full Screen'
      , accelerator: (() => {
      if (process.platform === 'darwin') {
        return 'Ctrl+Command+F';
      }
      else {
        return 'F11';
      }
    })()
      , click: (item, focusedWindow) => {
      
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }
    },
    {
      label: 'Toggle Developer Tools'
      , accelerator: (() => {
      
      if (process.platform === 'darwin') {
        return 'Alt+Command+I';
      }
      else {
        return 'Ctrl+Shift+I';
      }
    })()
      , click: (item, focusedWindow) => {
      
      if (focusedWindow) {
        focusedWindow.toggleDevTools();
      }
    }
    },
    {
      type: 'separator'
    },
    {
      label: 'App Menu Demo'
      , click: (item, focusedWindow) => {
      
      if (focusedWindow) {
        const options = {
          type: 'info'
          ,
          title: 'mbERP Application Menu Demo'
          ,
          buttons: ['OK']
          ,
          message: 'This demo is for the Menu section, showing how to create a clickable menu item in the applcation menu.'
        };
        electron.dialog.showMessageBox(focusedWindow, options, () => {
        });
      }
    }
    }
  ]
  },
  {
    label: '&Window'
    , id: `Window`
    , role: 'window'
    , submenu: [
    {
      label: 'Minimize'
      , accelerator: 'CmdOrCtrl+M'
      , role: 'minimize'
    },
    {
      label: 'Close'
      , accelerator: 'CmdOrCtrl+W'
      , role: 'close'
    },
    {
      type: 'separator'
    },
    {
      label: 'Reopen Window'
      , accelerator: 'CmdOrCtrl+Shift+T'
      , enabled: false
      , id: 'reopenMenuItem'
      , click: () => {
      
      app.emit('activate');
    }
    }
  ]
  },
  {
    label: '&Help'
    , id: `Help`
    , role: 'help'
    , submenu: [
    {
      label: 'Learn More'
      , click: () => {
      
      electron.shell.openExternal('http://electron.atom.io');
    }
    }
  ]
  }
];

if (process.platform === 'darwin') {
  const name = electron.app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: `About ${name}`
        , role: `about`
      },
      {
        type: 'separator'
      },
      {
        label: 'Services'
        , role: 'services'
        , submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: `Hide ${name}`
        , accelerator: 'Command+H'
        , role: 'hide'
      },
      {
        label: `Hide Others`
        , accelerator: `Command+Alt+H`
        , role: `hideothers`
      },
      {
        label: 'Show All'
        , role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        label: `Quit`
        , accelerator: `Command+Q`
        , click: () => {
        electron.app.quit();
      }
      }
    ]
  });
}

if (process.platform === 'win32') {
  const helpMenu = template[template.length - 1].submenu;
  
  let version = electron.app.getVersion();
  let updateItems = [
    {
    label: `Version ${version}`
    , enabled: false
  },
    {
      label: 'Checking for Update'
      , enabled: false
    },
    {
      label: 'Check for Update'
      , visible: false
      , id: 'checkForUpdate'
      , click: () => {
      require('electron').autoUpdater.checkForUpdates();
    }
    },
    {
      label: 'Restart and Install Update'
      , enabled: true
      , visible: false
      , id: 'restartToUpdate'
      , click: () => {
      require('electron').autoUpdater.quitAndInstall();
    }
    }
  ];
  
  addMenu(helpMenu, updateItems);
}

function addMenu(targetMenu, additionalMenuTemplate = null, position = 0) {
  // if (process.mas) return; //if this build for "mac app store" (mas)
  targetMenu.splice.apply(targetMenu, [position, 0].concat(additionalMenuTemplate));
}


/*
function findMenuItem(id) {
  const menu = electron.Menu.getApplicationMenu();
  if (!menu) return null;
  
  menu.items.forEach((item) => {
    if (item.submenu) {
      item.submenu.items.forEach((item) => {
        if (item.id === id) {
          return item;
        }
      });
    } else {
      if (item.id === id) {
        return item;
      }
    }
  });
  return null;
}

function findMenuIndex(id) {
  const menu = electron.Menu.getApplicationMenu();
  if (!menu) return null;
  
  menu.items.forEach((item) => {
    if (item.submenu) {
      item.submenu.items.forEach((item) => {
        if (item.id === id) {
          return item.submenu.items.indexOf(item);
        }
      });
    } else {
      if (item.id === id) {
        return items.indexOf(item);
      }
    }
  });
  return null;
}
*/

module.exports = template;

