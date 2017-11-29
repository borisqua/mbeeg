"use strict";
const
  {ipcRenderer} = require('electron')
  , {Tools} = require('mbeeg')
  , {switchSchema} = require('carousel-helpers')
;
let
  config = Tools.loadConfiguration('config.json')
;

$(() => {
  
  switchSchema(config);
  
  $(`.button#carousel`)
    .focus()
    .on(`click`, () => {
      ipcRenderer.send(`ipcMain-message`, `keyboard-launch`);
      e.preventDefault();
    })
  ;
  $(`.button#console`)
    .on(`click`, (e) => {
      ipcRenderer.send(`ipcMain-message`, `console-launch`);
      e.preventDefault();
    })
  ;
  ipcRenderer
    .on(`ipcConsole-command`, (e, arg) => {
      config = Tools.copyObject(arg);
      switchSchema(config);
    })
  ;
  
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };