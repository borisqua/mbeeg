"use strict";
// noinspection JSUnusedLocalSymbols
const
  {Stimuli} = require('mbeeg')
  , {remote, ipcRenderer} = require('electron'), {Keyboard} = require('carousel')
  , $ = require('jquery')
  , jQuery = $
;

$(() => {
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
      colorScheme: config.carousel.appearance.colorScheme,
      parametersOfStimulation: config.mbeeg.stimulation,
      stimuli: stimuli
    })
  ;
  
  //EVENT HANDLERS
  keyboard
    .on('keyboardLayoutChange', keyboard => {
      config.carousel.keyboard = keyboard;
      ipcRenderer.send('ipcKeyboard-command', 'keyboardLayoutChange');
    })
  ;
  
  //IPC EVENTS HANDLERS
  ipcRenderer
    .on(`ipcConsole-command`, (e, command) => {
      switch (command) {
        case "colorSchemeChange":
          keyboard.colorSchemeConfiguration = config.carousel.appearance.colorScheme;
          keyboard.reloadScheme(config.carousel.appearance.colorScheme);//todo>> maybe put reloadScheme inside colorSchemeConfiguration setter
          break;
        case "keyboardStimulationChange":
          keyboard.keyboardConfiguration = config.carousel.keyboard;
          keyboard.reloadScheme(config.carousel.appearance.colorScheme);//todo>> maybe put reloadScheme inside keyboardConfiguration setter
          break;
        case "stimuliChange":
          keyboard.stimuliConfiguration = config.mbeeg.stimulation;
          break;
        case "keyboxBordersChange":
          keyboard.switchKeyboxBorder(config.carousel.keyboard.keybox.showBorder);
          break;
        case "keyboxSizeChange":
          keyboard.updateKeyboxSize(config.carousel.keyboard.keybox);
          break;
        case "keyboardLayoutChange":
          keyboard.stimuliConfiguration = config.mbeeg.stimulation;
          keyboard
            .run(config.carousel.keyboard)
            .autofit()
          ;
          break;
        case "alphabetChange"://todo?? why redrawing on 'alphabet change' event slightly differ from 'first load' event redrawing??
          keyboard.stimuliConfiguration = config.mbeeg.stimulation;
          keyboard.run(config.carousel.keyboard);
          break;
        case "keyboardRestart"://drop previous input and restart stimulation from beginning with the same settings
          keyboard
            .run(config.carousel.keyboard)
            .text = '';
          break;
        case "autofit"://change window size to minimum (maximum compact) form
          keyboard.autofit();
          break;
        case "initialState":
          keyboard.initialState(config.carousel.keyboard.schools);
          break;
        case "motionChange":
          keyboard.motionChange(config.carousel.keyboard.schools);
          break;
        case "animationChange":
          keyboard.keyboardConfiguration = config.carousel.keyboard;
          break;
      }
    })
  ;
  
});
