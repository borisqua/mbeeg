var ebml = require('ebml');
var fs = require('fs');

var decoder = new ebml.Decoder();

decoder.on('data', function(chunk) {
  console.log(chunk);
});

fs.readFile('media/tcp_raw01.bin', function(err, data) { //*test.webm*
  if (err)
    throw err;
  //data might begin with first little endian 8 byte header
  decoder.write(data);
});
