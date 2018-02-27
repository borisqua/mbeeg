"use strict";
// noinspection JSUnusedLocalSymbols
const
  {Tools, Stimuli} = require('mbeeg')
  , {remote, ipcRenderer} = require('electron'), {Keyboard} = require('carousel')
  , $ = require('jquery')
  , jQuery = $
;

$(() => {
  // remote.getCurrentWindow().toggleDevTools();
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
    , keyboard = new Keyboard({
      keyboard: config.carousel.keyboard,
      colorScheme: config.carousel.appearance.colorScheme.selected,
      parametersOfStimulation: config.mbeeg.stimulation,
      stimuli: stimuli
    })
  ;
  
  //EVENT HANDLERS
  
  ipcRenderer
    .on(`ipcConsole-command`, (e, command) => {
      // config = Tools.copyObject(arg);
      switch (command) {
        case "colorSchemeChange":
          keyboard.reloadScheme(config.carousel.appearance.colorScheme.selected);
          break;
        case "keyboardStimulationChange":
          keyboard.keyboardConfiguration = config.carousel.keyboard;
          break;
        case "stimuliChange":
          keyboard.stimuliConfiguration = config.mbeeg.stimulation;
          break;
        case "keyboxBordersChange":
          keyboard.keyboxBorder(config.carousel.keyboard.keybox.showBorder);
          break;
        case "keyboxSizeChange":
          //keyboard.updateKeyboxSize
          break;
        case "keyboardRestart"://drop previous input and restart stimulation from beginning with the same settings
          keyboard
            .run(config.carousel.keyboard)
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
      // config.carousel.keyboard = Tools.copyObject(keyboard.keyboardConfiguration);
      // config.carousel.ipc.command = null;
      // Content.reloadSchema(config.carousel.appearance.colorScheme.selected);
    })
    .on('ipcKeyboard-command', (e, arg) => {
      config.carousel.keyboard = Tools.copyObject(keyboard.keyboardConfiguration);
    })
  ;
  
  // Content.reloadSchema(config.carousel.appearance.colorScheme.selected);
});
