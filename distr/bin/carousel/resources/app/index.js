"use strict";
const
  {remote, ipcRenderer} = require('electron')
  , {Tools} = require('mbeeg')
  , {Helpers} = require('carousel')
;
let
  config = remote.getGlobal('config')
;

$(() => {
  
  Helpers.reloadSchema(config);
  
  $(`.button#carousel`)
    .focus()
    .on(`click`, e => {
      ipcRenderer.send(`ipcMain-message`, `keyboardLaunch`);
      e.preventDefault();
    })
  ;
  $(`.button#console`)
    .on(`click`, e => {
      ipcRenderer.send(`ipcMain-message`, `consoleLaunch`);
      e.preventDefault();
    })
  ;
  ipcRenderer
    .on(`ipcConsole-command`, (e, arg) => {
      Helpers.reloadSchema(config);
    })
    .on('ipcKeyboard-command', (e, arg) => {
    });
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };