"use strict";
const
  {Stimuli} = require('mbeeg')
  , {remote, ipcRenderer} = require('electron'), {Keyboard} = require('carousel')
  , $ = require('jquery')
  , jQuery = $
;

$(() => {
  /** @namespace config.carousel.keyboard.stimulation.autostart */
  /** @namespace config.mbeeg.stimulation.sequence.stimuli */
  let
    config = remote.getGlobal('config')
    , stimuliEnd = false
    , stimuli = new Stimuli({
      stimuliIdArray: config.mbeeg.stimulation.sequence.stimuli,
      duration: config.mbeeg.stimulation.duration,
      pause: config.mbeeg.stimulation.pause,
      bound: config.carousel.keyboard.stimulation.autostart,
      // nextSequence: arr => {
      //   let last = arr[arr.length - 1];
      //   arr.sort(() => Math.random() - 0.5);
      //   return arr[0] === last ? arr.push(arr.shift()) : arr;
      // }
      nextSequence: arr => arr
      // ipcRenderer.send('ipcKeyboard-command', 'stimulationDone');
    })
    , keyboard = new Keyboard({
      keyboard: config.carousel.keyboard,
      colorScheme: config.carousel.appearance.colorScheme,
      parametersOfStimulation: config.mbeeg.stimulation,
      stimuli: stimuli
    })
  ;
  
  function commandSelector(request) {
    switch (request) {
      case "colorSchemeChange":
        /** @namespace config.carousel.appearance */
        keyboard.colorSchemeConfiguration = config.carousel.appearance.colorScheme;
        keyboard.reloadScheme(config.carousel.appearance.colorScheme);//todo>> maybe better put reloadScheme inside colorSchemeConfiguration setter
        break;
      case "keyboardStimulationChange":
        keyboard.keyboardConfiguration = config.carousel.keyboard;
        keyboard.reloadScheme(config.carousel.appearance.colorScheme);//todo>> maybe better put reloadScheme inside keyboardConfiguration setter
        break;
      case "stimuliChange":
        keyboard.stimuliConfiguration = config.mbeeg.stimulation;
        break;
      case "keyboxBordersChange":
        /** @namespace config.carousel.keyboard.keybox */
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
      case "keyboardStart"://drop previous input and restart stimulation from beginning with the same settings
        keyboard.startStimulation();
        break;
      case "keyboardStop"://drop previous input and restart stimulation from beginning with the same settings
        keyboard.stopStimulation();
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
  }
  
  //EVENT HANDLERS
  // noinspection JSUnresolvedFunction
  keyboard
    .on('keyboardLayoutChange', keyboard => {
      config.carousel.keyboard = keyboard;
      ipcRenderer.send('ipcKeyboard-command', 'keyboardLayoutChange');
    })
  ;

//IPC EVENTS HANDLERS
  ipcRenderer
    .on(`ipcConsole-command`, (e, command) => {
      commandSelector(command);
    })
  ;
  
});
