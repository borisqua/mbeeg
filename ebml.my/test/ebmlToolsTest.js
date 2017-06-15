'use strict';

let tools = require('../lib/tools');
let hexString = '01 2B 39 5F 10 8A DF AE';
let buffer = [];
let strBuffer = hexString.split(' ');
let bigEndian;
let littleEndian;

strBuffer.forEach((element, index) => {
  strBuffer[index] = '0x' + element;
});

strBuffer.forEach((element) => {
  buffer.push(parseInt(element, 16));
});

let start = 4;
let length = 4;

bigEndian = tools.bigEndian(buffer, start, length).toString(16);
littleEndian = tools.littleEndian(buffer, start, length).toString(16);

console.log(`${start + length - 1} <=> ${buffer.length}`);
console.log(`Hex array [${strBuffer}] \n little endian: ${littleEndian} \n big endian ${bigEndian}`);
