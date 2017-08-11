"use strict";
const
  DSProcessor = require(`../dsprocessor`),
  Classifier = require(`../classifier`);

class Controller {
  constructor(){
  
  }
  
  learning(){
  
  }
}

if(module.parent){
  module.exports = Controller;
}else{
  const controller = new Controller();
}