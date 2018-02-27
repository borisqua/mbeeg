"use strict";

const
  {remote, ipcRenderer} = require('electron')
  // , fs = require('fs')
  // , {Tools} = require('mbeeg')
  , {Console} = require('carousel')
;

$(() => {
  let
    config = remote.getGlobal('config')
    , console = new Console({
      consoleProperties: config.carousel.console
      , keyboardProperties: config.carousel.keyboard
      , mbeegProperties: config.mbeeg
      , colorScheme: config.carousel.appearance.colorScheme.selected
    })
  ;
  
  console.on('keyboardChange', keyboard => { Object.assign(config.carousel.keyboard, keyboard); });
  console.on('consoleChange', console => {Object.assign(config.carousel.console, console); });
  console.on('mbeegChange', mbeeg => { Object.assign(config.mbeeg, mbeeg); });
  
  console.addEventHandling('colorSchemeChange', 'change', $('#color-scheme'), 'value', config.carousel.appearance.colorScheme.selected,
    v => {
      config.carousel.appearance.colorScheme.selected = v;
      console.reloadScheme(v);
    });
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#color'), 'checked', config.carousel.keyboard.stimulation.color,
    v => {
      config.carousel.keyboard.stimulation.color = v;
    });
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#size'), 'checked', config.carousel.keyboard.stimulation.size,
    v => {
      config.carousel.keyboard.stimulation.size = v;
    });
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#shine'), 'checked', config.carousel.keyboard.stimulation.shine,
    v => {
      config.carousel.keyboard.stimulation.shine = v;
    });
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#animation'), 'value', config.carousel.keyboard.stimulation.animation.selected,
    v => config.carousel.keyboard.stimulation.animation.selected = v);
  
  console.addEventHandling('stimuliChange', 'input', $('.duration'), 'value', config.mbeeg.stimulation.duration,
    v => config.mbeeg.stimulation.duration = +v);
  
  console.addEventHandling('stimuliChange', 'input', $('.pause'), 'value', config.mbeeg.stimulation.pause,
    v => config.mbeeg.stimulation.pause = +v);
  
  console.addEventHandling('keyboxBordersChange', 'change', $('#keyboxBorder'), 'checked', config.carousel.keyboard.keybox.showBorder,
    v => config.carousel.keyboard.keybox.showBorder = v);
  
  console.addEventHandling('keyboxSizeChange', 'input', $('.keyboxHeight'), 'value', +config.carousel.keyboard.keybox.height,
    v => config.carousel.keyboard.keybox.height = +v);//todo>> font size change depending on keybox size
  
  console.addEventHandling('keyboxSizeChange', 'input', $('.keyboxWidth'), 'value', +config.carousel.keyboard.keybox.width,
    v => config.carousel.keyboard.keybox.width = +v);
  
  console.addEventHandling('keyboardRestart', 'input', $('.viewportColumns'), 'value', +config.carousel.keyboard.viewport.columns,
    v => {
      config.carousel.keyboard.viewport.columns = +v;
      console.updateKeyboardViewportProperties('columns', v);//todo>> add eventEmitter to console class
      console.updateMotionControlGroup();
    });
  
  console.addEventHandling('keyboardRestart', 'input', $('.viewportRows'), 'value', +config.carousel.keyboard.viewport.rows,
    v => {
      config.carousel.keyboard.viewport.rows = +v;
      console.updateKeyboardViewportProperties('rows', v);
      console.updateMotionControlGroup();
    });
  
  console.addEventHandling('', 'input', $('#alphabet'), 'value', config.carousel.keyboard.alphabet,
    v => {
      config.carousel.keyboard.alphabet = v;
      console.updateArrays(v);
    });
  
  //buttons
  console.addEventHandling('initialState', 'click', $('#initial-button'), "", "",
    () => {
      for (let i = 0; i < config.carousel.keyboard.schools.length; i++) {
        config.carousel.keyboard.schools[i].motion.speedScale = 0;
        $(`.speed${i}`).each((i, element) => element['value'] = 0);
      }
      // ipcRenderer.send(`ipcConsole-command`, config);
    });
  
  console.addEventHandling('autofit', 'click', $('#autofit-button'), "", "",
    () => { });
  
  console.addEventHandling('keyboardRestart', 'click', $('#restart-button'), "", "",
    () => { });
  
  $(".rnd")
  // .on('change', e => {
    .on('click', e => {
      e.preventDefault();
      // index = $(e.target).attr("index");
      // config.carousel.keyboard.schools[index].motion.randomSpeed = e.target.checked;
      // ipcRenderer.send(`ipcConsole-command`, config);
      alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
    })
  ;
  
  $(".reverse")
  // .on('change', e => {
    .on('click', e => {
      e.preventDefault();
      // index = $(e.target).attr("index");
      // config.carousel.keyboard.schools[index].motion.reverse = e.target.checked;
      // ipcRenderer.send(`ipcConsole-command`, config);
      alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
    })
  ;
  
  // ipcRenderer.on('ipcKeyboard-command', (e, arg) => {
  //   config = Tools.copyObject(arg);
  // });
  
});
