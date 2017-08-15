"use strict";
const
  {BrowserWindow, ipcRenderer } = require(`electron`);

$(()=> {
  $(`.button#carousel`).focus();
  $(`.button#carousel`).on(`click`, () => {
    ipcRenderer.send(`asynchronous-message`, `keyboard-launch`);
  });
  $(`.button#console`).on(`click`, () => {
    ipcRenderer.send(`asynchronous-message`, `console-launch`);
  });
  ipcRenderer.on(`asynchronous-reply`, (e, arg) => {
    let answer = `Asynchronous message reply ${arg}`;
    // if (!$(`#message`).html()) $(`#message`).html(answer);
    // else $(`#message`).html(``);
    !$(`#message`).html() && $(`#message`).html(answer) || $(`#message`).html(``);
  });
  
});

// window.onbeforeunload = function (e) {
//   return false;
// };