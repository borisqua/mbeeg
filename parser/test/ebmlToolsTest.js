'use strict';

let Helper = require('../ebml/helper');

let hexString = '11 2B 39 5F 10 8A DF AE';
let buffer = [];
let strBuffer = hexString.split(' ');

strBuffer.forEach((element, index) => {
  strBuffer[index] = '0x' + element;
});

strBuffer.forEach((element) => {
  buffer.push(parseInt(element, 16));
});

let start = 0;
let length = 8;

let ebmlHelper = new Helper(buffer);

let bigEndian = ebmlHelper.bigEndian(start, length).toString(16);
let bigEndianString = ebmlHelper.bigEndianString(start, length);
let littleEndian = ebmlHelper.littleEndian(start, length).toString(16);
let littleEndianString = ebmlHelper.littleEndianString(start, length);

let tagID = ebmlHelper.takeIdVInt();

console.log(`${start + length - 1} <=> ${buffer.length}`);
console.log(`Hex array [${strBuffer}] \n
              numeric little endian: ${littleEndian} \n
              string little endian: ${littleEndianString}
              numeric big endian ${bigEndian} \n
              string big endian ${bigEndianString}`);
// console.log(`tag id - ${ebmlHelper.takeIdVInt()}`);
