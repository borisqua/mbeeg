"use strict";
const
  {ipcRenderer} = require('electron');

$(() => {
  let
    config = Tools.loadConfiguration(`config.json`)
    , index, value,
    elementSpeedValue,
    elementSpeedSlider;
  
  function init(){
  
  }
  
  $(".ui-slider").on(`input`, (e) => {
    index = $(e.target).attr("index");
    elementSpeedValue = $("#speedValue" + index);
    elementSpeedSlider = $("#speedSlider" + index);
    value = elementSpeedSlider.val();
    elementSpeedValue.val(value);
    ipcRenderer.send(`ipcConsole-command`, {command: `change`, index: index, value: value});
    e.stopPropagation();
  });
  
  $(".value").on(`input`, (e) => {
    index = $(e.target).attr("index");
    elementSpeedValue = $("#speedValue" + index);
    elementSpeedSlider = $("#speedSlider" + index);
    value = elementSpeedValue.val();
    elementSpeedSlider.val(value);
    ipcRenderer.send(`ipcConsole-command`, {command: `change`, index: index, value: value});
    e.stopPropagation();
  });
  
  $("#restart").on('click', (e) => {
    ipcRenderer.send(`ipcConsole-command`, {command: `restart`});
    e.preventDefault();
  });
  
  $(".reverse").on('change', (e) => {
    index = $(e.target).attr("index");
    ipcRenderer.send(`ipcConsole-command`, {command: `reverse`, index: index});
    // e.preventDefault();
  });
  
  $(".rnd").on('click', (e) => {
    e.preventDefault();
    alert('UNDER CONSTRUCTION!!! \nOption not available yet...');
  })
});
