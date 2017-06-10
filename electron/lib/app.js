
(() =>{
  let app = angular.module('mbERP', []);
  let env = {
    node: {
      version: process.version
    },
    chrome: {
      version: process.versions['chrome']
    },
    electron: {
      version: process.versions['electron']
    },
    nodes: [
      {node:1},
      {node:2},
      {node:3},
      {node:4}
    ]
  };
  
  app.controller("mbERPController",function(){
    this.env = env;
  });
  
})();
