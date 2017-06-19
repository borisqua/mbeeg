
let EventEmitter = require('events').EventEmitter;

let db = new EventEmitter();

db.setMaxListeners(0);//set unlimited max listeners count

function Request() {
  let self = this;

  this.bigData = new Array(1e6).join('*');

  this.send = function (data) {
    console.log(data);
  };

  this.end = function () {
    db.removeListener('data', onData);
  };

  function onData(info) {
    self.send(info);
  }

  db.on('data', onData);
}

setInterval(function () {
  let request = new Request();
  request.end();
  console.log(process.memoryUsage().heapUsed);
  console.log(db);
}, 100);
