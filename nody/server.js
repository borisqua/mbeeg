let log = require('./logger')(module);
let db = require('db');
let debug = require('debug');

db.connect();

let Stuff=require('user');

function run() {
  let r = new Stuff();
  log(r.sum(2, 8));
  r.hello();
  log(db.getPhrase("Run successful"));
}

// console.log(module);

if(module.parent){
  exports.run = run;
}else{
  run();
}
//..
