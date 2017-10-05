"use strict";
let result = {};
const
  fs = require('fs'),
  split2 = require('split2'),
  decoder = require('string_decoder'),
  {Transform, Writable} = require('stream'),
  lineToArray = new Transform({
    objectMode: true,
    transform(line, encoding, callback) {
      let arr = line.toString().split(/:*\s+/);
      // callback(null, `"${arr[0]}": {"type":${arr[1]}, "name":${arr[2]}}\n`);
      callback(null, arr);
    }
  }),
  objectsToArray = new Writable({
    objectMode: true,
    write(line, encoding, callback) {
      result[`${line[0]}`] = JSON.parse(`{"type":"${line[1]}", "name":"${line[2]}"}`);
      callback();
    }
  }),
  sourceFile = fs.createReadStream(`./z_ebml_id_work.txt`),
  targetFile = fs.createWriteStream(`./ebml_dictionary.json`);

sourceFile
  .pipe(split2())
  .pipe(lineToArray)
  .pipe(objectsToArray);

objectsToArray.on(`finish`, () => {
  targetFile.write(JSON.stringify(result,null,1));
});
