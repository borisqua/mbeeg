const
  // Debug = require('debug')('mberp:processor'),
  // Client = require('net').Socket(),
  // Tools = require('../parser/ebml/helper'),
  fs = require('fs'),
  Reader = require('../parser/ebml/reader');

const reader = new Reader();

reader.on('data', function (chunk) {
  console.log(chunk);
});

fs.readFile('./media/tcp_raw01.bin', function (err, data) { //*test.webm*
  if (err)
    throw err;
  //data might begin with first little endian 8 byte header
  reader.write(data);
});
