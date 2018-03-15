"use strict";
// noinspection JSUnusedLocalSymbols
const
  {remote, ipcRenderer} = require('electron')
  , {Window}= new require('carousel')
  , $ = require('jquery')
  , jQuery = $
;
let
  config = remote.getGlobal('config')
;
const
  windowContent = new Window({colorScheme: config.carousel.appearance.colorScheme})
;

$(() => {
  
  //EVENT HANDLERS
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
  
  //INTER-PROCESS COMMUNICATION
  ipcRenderer
    .on(`ipcConsole-command`, (e, command) => {
      // config = Tools.copyObject(arg);
      switch (command) {
        case "colorSchemeChange":
          windowContent.reloadScheme(config.carousel.appearance.colorScheme);
          break;
        default:
      }
    })
    .on('ipcKeyboard-command', (e, arg) => {
    })
  ;
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };