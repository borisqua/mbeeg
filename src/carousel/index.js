"use strict";
const
  {ipcRenderer} = require('electron');

$(() => {
  $(`.button#carousel`)
    .focus()
    .on(`click`, () => {
      ipcRenderer.send(`ipcRenderer-message`, `keyboard-launch`);
      e.preventDefault();
    });
  $(`.button#console`).on(`click`, (e) => {
    ipcRenderer.send(`ipcRenderer-message`, `console-launch`);
    e.preventDefault();
  });
  ipcRenderer.on(`ipcMain-reply`, (e, arg) => {//asynchronous-reply
    let
      answer = `Asynchronous message reply ${arg}`
      , messageElement = $(`#message`)
    ;
    // if (!$(`#message`).html()) $(`#message`).html(answer);
    // else $(`#message`).html(``);
    !messageElement.html() && messageElement.html(answer) || messageElement.html(``);
    // !$(`#message`).html() && $(`#message`).html(answer) || $(`#message`).html(``);
  });
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };