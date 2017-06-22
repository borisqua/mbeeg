'use strict';

let Helper = require('../ebml/helper');
let buffer = [];

let hexString = '11 2B 39 5F 10 8A DF AE';
let strBuffer = hexString.split(' ');
strBuffer.forEach((element) => {
  buffer.push(parseInt(element, 16));
});
let ebmlHelper = new Helper(buffer);

let start = 0;
let length = 8;

//getting the length of the vInt
let vIntlength = ebmlHelper.vIntLength(0,[16,17,58]);
vIntlength = ebmlHelper.vIntLength();
let bigEndianString = ebmlHelper.bigEndian(start, length);
let littleEndianString = ebmlHelper.littleEndian(start, length);
let bigEndian = ebmlHelper.bigEndian(start, length).toString(16);
let littleEndian = ebmlHelper.littleEndian(start, length).toString(16);

let tagID = ebmlHelper.takeIdVInt();

console.log(`${start + length - 1} <=> ${buffer.length}`);
console.log(`Hex array [${strBuffer}]
              string little endian: ${littleEndianString}
              string big endian ${bigEndianString}`);
console.log(`tag id {length: ${tagID.length}, value: ${tagID.value}`);
