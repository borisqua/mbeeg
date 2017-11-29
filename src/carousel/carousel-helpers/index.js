"use strict";

function stimulusOn(element, config) {
  if (config.appearance.stimulation.color) {
    element.addClass(`keybox-${config.appearance.colorScheme.selected}-color`)
  }
  if (config.appearance.stimulation.size) {
    element.addClass(`keybox-${config.appearance.colorScheme.selected}-size`)
  }
  if (config.appearance.stimulation.shine) {
    element.addClass(`keybox-${config.appearance.colorScheme.selected}-shine`)
  }
  if (config.appearance.stimulation.animation.selected === "shake") {
    element.addClass(`keybox-${config.appearance.colorScheme.selected}-shake`)
  }
  if (config.appearance.stimulation.animation.selected === "turn") {
    element.addClass(`keybox-${config.appearance.colorScheme.selected}-turn`)
  }
  if (config.appearance.stimulation.animation.selected === "capsize") {
    element.addClass(`keybox-${config.appearance.colorScheme.selected}-capsize`)
  }
}
function stimulusOff(element, config) {
  // if (config.appearance.stimulation.color) {
    element.removeClass(`keybox-${config.appearance.colorScheme.selected}-color`)
  // }
  // if (config.appearance.stimulation.size) {
    element.removeClass(`keybox-${config.appearance.colorScheme.selected}-size`)
  // }
  // if (config.appearance.stimulation.shine) {
    element.removeClass(`keybox-${config.appearance.colorScheme.selected}-shine`)
  // }
  // if (config.appearance.animation === "shake") {
    element.removeClass(`keybox-${config.appearance.colorScheme.selected}-shake`)
  // }
  // if (config.appearance.animation === "turn") {
    element.removeClass(`keybox-${config.appearance.colorScheme.selected}-turn`)
  // }
  // if (config.appearance.animation === "capsize") {
    element.removeClass(`keybox-${config.appearance.colorScheme.selected}-capsize`)
  // }
}

function switchSchema(config) {
  let
    html = $('html')
    , keybox = $('.key')
  ;
  switch (config.appearance.colorScheme.selected) {
    case `dark`:
      html.removeClass("light");
      keybox.removeClass("keybox-light");
      html.addClass("dark");
      keybox.addClass("keybox-dark");
      keybox.hover(
        function () {stimulusOn($(this), config)},
        function () {stimulusOff($(this), config)}
      );
      break;
    case `light`:
      html.removeClass("dark");
      keybox.removeClass("keybox-dark");
      html.addClass("light");
      keybox.addClass("keybox-light");
      keybox.hover(
        function () {stimulusOn($(this), config)},
        function () {stimulusOff($(this), config)}
      );
      break;
  }
  
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
  switchSchema: switchSchema,
  stimulusOn: stimulusOn,
  stimulusOff: stimulusOff
};
