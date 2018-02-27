"use strict";
// noinspection JSUnusedLocalSymbols
const
  {Tools, Stimuli} = require('mbeeg')
  , {remote, ipcRenderer} = require('electron')
  , {Keyboard, Helpers} = require('carousel')
  , $ = require('jquery')
  , jQuery = $
;

$(() => {
  // require('electron').remote.getCurrentWindow().toggleDevTools();
  let
    config = remote.getGlobal('config')
    , stimuli = new Stimuli({
      stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli,
      duration: config.mbeeg.stimulation.duration,
      pause: config.mbeeg.stimulation.pause,
      nextSequence: arr => {
        let last = arr[arr.length - 1];
        arr.sort(() => Math.random() - 0.5);
        return arr[0] === last ? arr.push(arr.shift()) : arr;
      }
    })
    , keyboard = new Keyboard({config: config, stimuli: stimuli})
  ;
  
  ipcRenderer
    .on(`ipcConsole-command`, (e, arg) => {
      config = Tools.copyObject(arg);
      switch (config.carousel.ipc.command) {
        case "restart"://drop previous input and restart stimulation from beginning with the same settings
          keyboard
            .run(config)
            .text = '';
          break;
        case "autofit"://change window size to minimum (maximum compact) form
          keyboard.autofit(config);
          break;
        case "initialState":
          keyboard.initialState(config.carousel.keyboard.schools);
          break;
        case "motionChange":
          keyboard.motionChange(config.carousel.keyboard.schools);
          break;
      }
      config = Tools.copyObject(keyboard.configuration);
      config.carousel.ipc.command = null;
      Helpers.reloadSchema(config);
    })
    .on('ipcKeyboard-command', (e, arg) => {
      config = Tools.copyObject(arg);
      keyboard.init(config);
    })
  ;
  
  Helpers.reloadSchema(config);
});
