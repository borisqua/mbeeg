"use strict";

const
  {ipcRenderer, remote} = require('electron')
  , {Tools} = require('mbeeg')
  , {switchSchema} = require('carousel-helpers')
;


$(() => {
  let
    // fs = require('fs')
    config = Tools.loadConfiguration(`config.json`)
    , index
    , value
    , colorScheme = $('input[name=color-scheme]')
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
    , motionControls = $('#motion')
  ;
  
  function init() {
    if (config.appearance.colorScheme === "dark") $('#dark').attr('checked', true);
    if (config.appearance.colorScheme === "light") $('#light').attr('checked', true);
    colorScheme
      .on('change', e => {
        config.appearance.colorScheme = e.target.value;
        ipcRenderer.send(`ipcConsole-command`, config);
        switchSchema(config);
        // fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
        ipcRenderer.send(`ipcConsole-command`, config);
      })
    ;
    
    if (config.appearance.stimulation.color)
      stimulusColor.attr('checked', true);
    else
      stimulusColor.attr('checked', false);
    stimulusColor
      .on('change', e => {
        // config.appearance.stimulation.color = e.target.is(':checked');
        config.appearance.stimulation.color = e.target.checked;
        // fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
        switchSchema(config);
        ipcRenderer.send(`ipcConsole-command`, config);
      })
    ;
    
    if (config.appearance.stimulation.size) stimulusSize.attr('checked', true);
    else stimulusSize.attr('checked', false);
    stimulusSize
      .on('change', e => {
        config.appearance.stimulation.size = e.target.checked;
        // fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
        switchSchema(config);
        ipcRenderer.send(`ipcConsole-command`, config);
      })
    ;
    
    if (config.appearance.stimulation.shine) stimulusShine.attr('checked', true);
    else stimulusShine.attr('checked', false);
    stimulusShine
      .on('change', e => {
        config.appearance.stimulation.shine = e.target.checked;
        // fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
        switchSchema(config);
        ipcRenderer.send(`ipcConsole-command`, config);
      })
    ;
    
    stimulusAnimation.val(config.appearance.animation);
    stimulusAnimation
      .on('change', e => {
        config.appearance.animation = e.target.value;
        // fs.writeFile(`config.json`, JSON.stringify(config, null, 2), err => { if (err) throw err; });
        switchSchema(config);
        ipcRenderer.send(`ipcConsole-command`, config);
      })
    ;
    
    $('#duration').val(+config.stimulation.duration);
    $('#durationSlider').val(+config.stimulation.duration);
    $('#pause').val(+config.stimulation.pause);
    $('#pauseSlider').val(+config.stimulation.pause);
    
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
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "duration") {
          value = +elementDurationValue.val();
          elementDurationSlider.val(value);
          config.stimulation.duration = value;
          switchSchema(config);
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "pause") {
          value = +elementPauseValue.val();
          elementPauseSlider.val(value);
          config.stimulation.pause = value;
          switchSchema(config);
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
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "durationSlider") {
          value = +elementDurationSlider.val();
          elementDurationValue.val(value);
          config.stimulation.duration = value;
          switchSchema(config);
          ipcRenderer.send(`ipcConsole-command`, config);
        } else if ($(e.target).attr("id") === "pauseSlider") {
          value = +elementPauseSlider.val();
          elementPauseValue.val(value);
          config.stimulation.pause = value;
          switchSchema(config);
          ipcRenderer.send(`ipcConsole-command`, config);
        }
        e.stopPropagation();
      })
    ;
    
    $("#restart")
      .on('click', e => {
        ipcRenderer.send(`ipcConsole-command`, config);
        e.preventDefault();
      })
    ;
    
    $(".reverse")
      .on('change', e => {
        index = $(e.target).attr("index");
        config.keyboard.schools[index].motion.reverse = e.target.checked;
        ipcRenderer.send(`ipcConsole-command`, config);
        // e.preventDefault();
      })
    ;
    
    $(".rnd")
      .on('click', e => {
        e.preventDefault();
        index = $(e.target).attr("index");
        config.keyboard.schools[index].motion.randomSpeed = e.target.checked;
        ipcRenderer.send(`ipcConsole-command`, config);
        alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
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
