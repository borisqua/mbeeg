"use strict";
const python = require('child_process').spawn('python',['./test.py', ['-u', '-i']]);

let
  data = [1,2,3,4,5,6,7,8,9],
  dataString = '';

python.stdout.on('data', (data) => {
  dataString += data;
});

python.stdout.on(`end`, () => {
  console.log(dataString);
});

python.stdout.on('data', function(data){
  dataString += data.toString();
});
python.stdout.on('end', function(){
  console.log('Sum of numbers=',dataString);
});

python.stdin.write(JSON.stringify(data));
python.stdin.end();
