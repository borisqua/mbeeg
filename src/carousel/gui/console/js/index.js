"use strict";
//todo hover behavious doesn't update animations
const
  {ipcRenderer} = require('electron')
  , fs = require('fs')
  , {Tools} = require('mbeeg')
  , {switchSchema} = require('carousel-helpers')
;

$(() => {
  let
    config = Tools.loadConfiguration(`config.json`)
    , index
    , value
    , colorScheme = $('#color-scheme')
    , stimulusColor = $('#color')
    , stimulusSize = $('#size')
    , stimulusShine = $('#shine')
    , stimulusAnimation = $('#animation')
    , elementSpeedValue
    , elementSpeedSlider
    , elementDurationValue = $('#duration')
    , elementDurationSlider = $('#durationSlider')
    , elementPauseValue = $('#pause')
    , elementPauseSlider = $('#pauseSlider')
    // , motionReverse = $(".reverse")
    // , motionRandom = $(".rnd")
    , motionControls = $('#motion')
  ;
  
  function init() {
    
    /**
     * private function, initializes and add listener to each element of given jQuery collection
     * @param jquery - jQuery collection by selector to work with
     * @param property - property of html element to set and store in config file
     * @param valueFromConfig - value from configuration file to initialize settings console form fields
     * @param toConfig - callback function to store changes into configuration data file
     */
    function addChangeListener(jquery, property, valueFromConfig, toConfig) {
      jquery[0][property] = valueFromConfig;
      jquery
        .on('change', e => {
          toConfig(e.target[property]);
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        });
    }
    
    addChangeListener(colorScheme, 'value', config.appearance.colorScheme.selected,
      v => config.appearance.colorScheme.selected = v);
    addChangeListener(stimulusColor, 'checked', config.appearance.stimulation.color,
      v => config.appearance.stimulation.color = v);
    addChangeListener(stimulusSize, 'checked', config.appearance.stimulation.size,
      v => config.appearance.stimulation.size = v);
    addChangeListener(stimulusShine, 'checked', config.appearance.stimulation.shine,
      v => config.appearance.stimulation.shine = v);
    addChangeListener(stimulusAnimation, 'value', config.appearance.stimulation.animation.selected,
      v => config.appearance.stimulation.animation.selected = v);
    
    elementDurationValue.val(+config.stimulation.duration);
    elementDurationSlider.val(+config.stimulation.duration);
    elementPauseValue.val(+config.stimulation.pause);
    elementPauseSlider.val(+config.stimulation.pause);
    
    $(".value")
      .on(`input`, e => {
        index = $(e.target).attr("index");
        if (index) { //speed scale of school
          elementSpeedValue = $("#speedValue" + index);
          elementSpeedSlider = $("#speedSlider" + index);
          value = +elementSpeedValue.val();
          elementSpeedSlider.val(value);
          config.keyboard.schools[index].motion.speedScale = value;
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "duration") {
          value = +elementDurationValue.val();
          elementDurationSlider.val(value);
          config.stimulation.duration = value;
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "pause") {
          value = +elementPauseValue.val();
          elementPauseSlider.val(value);
          config.stimulation.pause = value;
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        }
        e.stopPropagation();
      })
    ;
    
    $(".slider")
      .on(`input`, e => {
        index = $(e.target).attr("index");
        if (index) { //speed scale of school
          elementSpeedValue = $("#speedValue" + index);
          elementSpeedSlider = $("#speedSlider" + index);
          value = +elementSpeedSlider.val();
          elementSpeedValue.val(value);
          config.keyboard.schools[index].motion.speedScale = value;
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "durationSlider") {
          value = +elementDurationSlider.val();
          elementDurationValue.val(value);
          config.stimulation.duration = value;
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "pauseSlider") {
          value = +elementPauseSlider.val();
          elementPauseValue.val(value);
          config.stimulation.pause = value;
          switchSchema(config);
          fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
          ipcRenderer.send(`ipcConsole-command`, config);
        }
        e.stopPropagation();
      })
    ;
    
    $(".rnd")
    // .on('change', e => {
      .on('click', e => {
        e.preventDefault();
        // index = $(e.target).attr("index");
        // config.keyboard.schools[index].motion.randomSpeed = e.target.checked;
        // ipcRenderer.send(`ipcConsole-command`, config);
        alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
      })
    ;
    
    $(".reverse")
    // .on('change', e => {
      .on('click', e => {
        e.preventDefault();
        // index = $(e.target).attr("index");
        // config.keyboard.schools[index].motion.reverse = e.target.checked;
        // ipcRenderer.send(`ipcConsole-command`, config);
        alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
      })
    ;
    
    $("#restart")//todo consider restart necessity
      .on('click', e => {
        ipcRenderer.send(`ipcConsole-command`, 'restart-keyboard');
        e.preventDefault();
      })
    ;
    
  }
  
  function getMotionControlGroup(index) {
    return $(`
          <div class="inputbox">
						<label class = "centered" for="speedValue${index}"> school ${index} </label>
						<input class="centered slider" type="range" min="0" max="1" step="0.01" value="${config.keyboard.schools[index].motion.speedScale}" id="speedSlider${index}" index="${index}">
						<input id="speedValue${index}" class="value" value="${config.keyboard.schools[index].motion.speedScale}" index="${index}"/>
						<label for="randomSpeed${index}"> &nbsp;</label>
						<input class="rnd" type="checkbox" id="randomSpeed${index}" index="${index}"/>
						<label for="reverseMovement${index}"> &nbsp;</label>
						<input class="reverse" type="checkbox" id="reverseMovement${index}" index="${index}"/>
						<label for="easing${index}"> &nbsp;</label>
            <select id="easing${index}">
            	<option>linear</option>
            	<option>swing</option>
            	<option>rough</option>
            	<option selected="true">slow motion</option>
            	<option>stepped</option>
            </select>
						<label for="bezier${index}"> &nbsp;</label>
            <button id="bezier${index}">add bezier path</button>
          </div>
    `);
    //fieldset(class="effects")
    //legend effects
    //.inputbox
    //label(for="bezier" ) add bezier path
    //input(type="checkbox" id="bezier" )
    //.inputbox
    //label(for="easing" ) easing
    //select(id="easing")
    //	option linear
    //	option swing
    //	option rough
    //	option(selected=true) slow motion
    //	option stepped
    //.inputbox
    //	button(id="restart") restart
    //.inputbox
  }
  
  for (let i = 0; i < config.keyboard.schools.length; i++) {
    motionControls.append(getMotionControlGroup(i));
  }
  
  init();
  switchSchema(config);
  
});
