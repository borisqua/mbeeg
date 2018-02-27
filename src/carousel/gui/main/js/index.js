"use strict";
// noinspection JSUnusedLocalSymbols
const
  {remote, ipcRenderer} = require('electron')
  , {Content }= new require('carousel')
  , $ = require('jquery')
  , jQuery = $
;
let
  config = remote.getGlobal('config')
;
const
  content = new Content({colorScheme: config.carousel.appearance.colorScheme.selected})
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
          content.reloadScheme(config.carousel.appearance.colorScheme.selected);
          break;
        default:
      }
      // config.carousel.keyboard = Tools.copyObject(keyboard.keyboardConfiguration);
      // config.carousel.ipc.command = null;
      // Content.reloadSchema(config.carousel.appearance.colorScheme.selected);
    })
    .on('ipcKeyboard-command', (e, arg) => {
      // config.carousel.keyboard = Tools.copyObject(arg.keyboardConfiguration);
    })
  ;
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };