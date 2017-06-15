var ebml = require('./index.js');
var fs = require('fs');

var decoder = new ebml.Decoder();

decoder.on('data', function(chunk) {
    console.log(chunk);
});

debugger;

fs.readFile('media/tcp_raw01.bin'/*media/test.webm*/, function(err, data) { /*test.webm*/

    if (err)
        throw err;
    decoder.write(data);
});