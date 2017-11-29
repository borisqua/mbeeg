"use strict";

function stimulusOn(element, config) {
  if (config.appearance.stimulation.color) {
    element.addClass("keybox-dark-hover-color")
  }
  if (config.appearance.stimulation.size) {
    element.addClass("keybox-dark-hover-size")
  }
  if (config.appearance.stimulation.shine) {
    element.addClass("keybox-dark-hover-shine")
  }
  if (config.appearance.stimulation.shake) {
    element.addClass("keybox-dark-hover-shake")
  }
  if (config.appearance.stimulation.turn) {
    element.addClass("keybox-dark-hover-turn")
  }
}
function stimulusOff(element, config) {
  if (config.appearance.stimulation.color) {
    element.removeClass("keybox-dark-hover-color")
  }
  if (config.appearance.stimulation.size) {
    element.removeClass("keybox-dark-hover-size")
  }
  if (config.appearance.stimulation.shine) {
    element.removeClass("keybox-dark-hover-shine")
  }
  if (config.appearance.stimulation.shake) {
    element.removeClass("keybox-dark-hover-shake")
  }
  if (config.appearance.stimulation.turn) {
    element.removeClass("keybox-dark-hover-turn")
  }
}

function switchSchema(config) {
  let
    html = $('html')
    , keybox = $('.key')
  ;
  switch (config.appearance.colorScheme) {
    case `dark`:
      html.addClass("dark");
      keybox.addClass("keybox-dark");
      html.removeClass("light");
      keybox.removeClass("keybox-light");
      keybox.removeClass("keybox-light-hover");
      keybox.hover(
        function () {stimulusOn($(this), config)},
        function () {stimulusOff($(this), config)}
      );
      break;
    case `light`:
      html.addClass("light");
      keybox.addClass("keybox-light");
      html.removeClass("dark");
      keybox.removeClass("keybox-dark");
      keybox.removeClass("keybox-dark-hover");
      keybox.hover(
        function () {stimulusOn($(this), config)},
        function () {stimulusOff($(this), config)}
      );
      break;
  }
  
}

module.exports = {
  switchSchema: switchSchema,
  stimulusOn: stimulusOn,
  stimulusOff: stimulusOff
};
