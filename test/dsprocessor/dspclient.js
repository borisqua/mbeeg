"use strict";
//connects to DSProcessor and pass into it raw EEG data
//logs eeg epochs with filtered and processed data into
// console and file

const server = require(`../dsprocessor`);
const fs = require('fs');
let path = `./data/tcp_raw01.bin`;

fs.readFile(path, function (err, data) { //*test.webm*
  if (err)
    throw err;
  //data might begin with first little endian 8 byte header
  reader.write(data);
});

