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
    let answer = `Asynchronous message reply ${arg}`;
    // if (!$(`#message`).html()) $(`#message`).html(answer);
    // else $(`#message`).html(``);
    !$(`#message`).html() && $(`#message`).html(answer) || $(`#message`).html(``);
  });
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };