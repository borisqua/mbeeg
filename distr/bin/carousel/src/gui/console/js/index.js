"use strict";

const
  {remote, ipcRenderer} = require('electron')
  , {Console} = require('carousel')
;

$(() => {
  let
    config = remote.getGlobal('config')
    , console = new Console({
      consoleProperties: config.carousel.console
      , keyboardProperties: config.carousel.keyboard
      , mbeegProperties: config.mbeeg
      , colorScheme: config.carousel.appearance.colorScheme
    })
  ;
  
  //handle console instance internal events
  console.on('keyboardChange', keyboard => {
    config.carousel.keyboard = keyboard;
    ipcRenderer.send('ipcConsole-command', 'keyboardChange');
  });
  console.on('consoleChange', console => {
    config.carousel.console = console;
    //todo?? consider if console internal change handling required ??
  });
  console.on('stimuliChange', mbeeg => {
    config.mbeeg = mbeeg;
    ipcRenderer.send('ipcConsole-command', 'stimuliChange');
  });
  
  console.addEventHandling('colorSchemeChange', 'change', $('#color-scheme'), 'value', config.carousel.appearance.colorScheme.selected,
    v => {
      config.carousel.appearance.colorScheme.selected = v;
      console.colorSchemeConfiguration = config.carousel.appearance.colorScheme;
    });
  
  console.addEventHandling('mbeegChange', 'change', $('#external-mbeeg'), 'checked', config.mbeeg.tcpserver.active,
    v => {
      config.mbeeg.tcpserver.active = v;
      alert("You need to restart the main application window for the changes to take effect");
    });
  
  console.addEventHandling('stimulationAutostart', 'change', $('#stimulation-autostart'), 'checked', config.carousel.keyboard.stimulation.autostart,
    v => {
      config.carousel.keyboard.stimulation.autostart = v;
      alert("You need to restart the main application window for the changes to take effect");
    });
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#color'), 'checked', config.carousel.keyboard.stimulation.color,
    v => config.carousel.keyboard.stimulation.color = v);
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#size'), 'checked', config.carousel.keyboard.stimulation.size,
    v => config.carousel.keyboard.stimulation.size = v);
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#weight'), 'checked', config.carousel.keyboard.stimulation.weight,
    v => config.carousel.keyboard.stimulation.weight = v);
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#shine'), 'checked', config.carousel.keyboard.stimulation.shine,
    v => config.carousel.keyboard.stimulation.shine = v);
  
  console.addEventHandling('keyboardStimulationChange', 'change', $('#animation'), 'value', config.carousel.keyboard.stimulation.animation.selected,
    v => config.carousel.keyboard.stimulation.animation.selected = v);
  
  console.addEventHandling('stimuliChange', 'input', $('.stimulusDuration'), 'value', config.mbeeg.stimulation.duration,
    v => config.mbeeg.stimulation.duration = +v);
  
  console.addEventHandling('stimuliChange', 'input', $('.stimulusPause'), 'value', config.mbeeg.stimulation.pause,
    v => config.mbeeg.stimulation.pause = +v);
  
  console.addEventHandling('keyboxBordersChange', 'change', $('#keyboxBorder'), 'checked', config.carousel.keyboard.keybox.showBorder,
    v => config.carousel.keyboard.keybox.showBorder = v);
  
  console.addEventHandling('keyboxSizeChange', 'input', $('.keyboxHeight'), 'value', +config.carousel.keyboard.keybox.height,
    v => config.carousel.keyboard.keybox.height = +v);
  
  console.addEventHandling('animationChange', 'input', $('.animationDuration'), 'value', +config.carousel.keyboard.animation.tweenDuration,
    v => config.carousel.keyboard.animation.tweenDuration = +v);
  
  console.addEventHandling('animationChange', 'input', $('.leftShift'), 'value', +config.carousel.keyboard.animation.leftShift,
    v => config.carousel.keyboard.animation.leftShift = +v);
  
  console.addEventHandling('keyboxSizeChange', 'input', $('.keyboxWidth'), 'value', +config.carousel.keyboard.keybox.width,
    v => config.carousel.keyboard.keybox.width = +v);
  
  console.addEventHandling('keyboardLayoutChange', 'input', $('.viewportColumns'), 'value', +config.carousel.keyboard.viewport.columns,
    v => {
      config.carousel.keyboard.viewport.columns = +v;
      console.keyboardCoreConfiguration = config.carousel.keyboard;
    });
  
  console.addEventHandling('keyboardLayoutChange', 'input', $('.viewportRows'), 'value', +config.carousel.keyboard.viewport.rows,
    v => {
      config.carousel.keyboard.viewport.rows = +v;
      console.keyboardCoreConfiguration = config.carousel.keyboard;
    });
  
  console.addEventHandling('alphabetChange', 'input', $('#alphabet'), 'value', config.carousel.keyboard.alphabet,
    v => {
      config.carousel.keyboard.alphabet = v;
      console.alphabet = v;
    });
  
  //buttons
  console.addEventHandling('initialState', 'click', $('#initial-button'), "", "",
    () => {
      for (let i = 0; i < config.carousel.keyboard.schools.length; i++) {
        config.carousel.keyboard.schools[i].motion.speedScale = 0;
        $(`.speed${i}`).each((i, element) => element['value'] = 0);
      }
    });
  
  //todo>> when "autofit" message sent, keyboard receives it and changes keyboard size and shape and
  // then emits "keyboardChange" event that causes "keyboardChange" message broadcasting, then
  // console receives that message and update keyboard arrays and this sets "speedScales" of
  // schools to zero
  console.addEventHandling('autofit', 'click', $('#autofit-button'), "", "",
    () => { });
  
  console.addEventHandling('keyboardRestart', 'click', $('#restart-button'), "", "",
    () => { });//todo?? why when restarting keyboard redraws twice ?? To clarify draw UML diagrams of keyboard restart process
  
  console.addEventHandling('keyboardStart', 'click', $('#start-button'), "", "",
    () => { });
  
  console.addEventHandling('keyboardStop', 'click', $('#stop-button'), "", "",
    () => { });
  
  ipcRenderer.on('ipcKeyboard-command', (e, command) => {
    switch (command) {
      case "keyboardLayoutChange":
        console.keyboardLayoutConfiguration = config.carousel.keyboard;
        break;
      default:
        break;
    }
  });
  
});
