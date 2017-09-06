"use strict";
const
  appRoot = require(`app-root-path`),
  // Debug = require('debug')('mberp:dsprocessor'),
  // Client = require('net').Socket(),
  // Tools = require(`${appRoot}/src/tools/helper`),
  fs = require('fs'),
  Reader = require(`${appRoot}/src/tools/parser/ebml/reader`);

const reader = new Reader();

reader.on('data', (chunk)=> {
  console.log(chunk);
});

fs.readFile('./data/tcp_raw01.bin', function (err, data) { //*test.webm*
  if (err)
    throw err;
  //data might begin with first little endian 8 byte header
  reader.write(data);
});
