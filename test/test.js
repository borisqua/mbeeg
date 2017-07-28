"use strict";
const {Writable, Transform} = require('stream');
const fs = require('fs');

const writeStream = fs.createWriteStream(`./dsprocessor/data/1.0_sourceEEG/1.1stimule.csv`);

let transform = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback){
    chunk.timestamp = new Date();
    callback(null, JSON.stringify(chunk,null,2)+`\n`);
  }
});

transform.pipe(process.stdout);

transform.write({status: 404, message: `Not found`});
transform.write({status: 500, message: `Internal server error`});


