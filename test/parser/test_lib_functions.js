'use strict';
const
// Debug = require('debug')('mberp:test:helper'),
  appRoot = require(`app-root-path`),
  Helper = require(`${appRoot}/src/tools/parser/ebml/helper`),
  buffer = [];

let hexString = '11 2B 39 5F 10 8A DF AE';
let strBuffer = hexString.split(' ');
strBuffer.forEach((element) => {
  buffer.push(parseInt(element, 16));
});

let start = 0;
let length = 8;

//getting the length of the vInt
let {length: vIntLength, value: vIntValue, buffer: vIntBuffer} = Helper.vInt(buffer);
let bigEndianString = Helper.bigEndian(vIntBuffer, vIntLength);
let littleEndianString = Helper.littleEndian(vIntBuffer, vIntLength);
// let bigEndian = ebmlHelper.bigEndian(start, length).toString(16);
// let littleEndian = ebmlHelper.littleEndian(start, length).toString(16);

Debug(`${start + length - 1} <=> ${vIntBuffer.length}`);
Debug(`Hex array [${vIntBuffer}]
              string little endian: ${littleEndianString}
              string big endian ${bigEndianString}`);
Debug(`tag id {length: ${vIntLength}, value: ${vIntValue}`);

for (let i = 0; i < 3; i++) {
  let j, value, alternativeLengthCalculation;
  for (j = 255; j > 0; j--) {
    buffer[i] = j;
    length = i + 1;
    value = parseInt(Helper.bigEndian(buffer, length, start), 16); //value in descriptor
    alternativeLengthCalculation = Math.ceil(Math.log2(-(1 + ~(1 << (i + 1) * 8)) / value)); //length of vInt
    let vInt = Helper.vInt(buffer, start);
    let hexBuffer = [];
    vInt.buffer.forEach((element) => {
      hexBuffer.push(element.toString(16));
    });
    Debug(`${255 * i + 256 - j}. [${buffer}] [${vInt.buffer}]; value==${vInt.value}[${hexBuffer}]; first byte==${vInt.start}; length==${vInt.length} == ${alternativeLengthCalculation}`);
    if (vInt.length !== alternativeLengthCalculation) debugger;
    if (vInt.value !== hexBuffer.join('')) debugger;
  }
  // debugger;
  buffer[i] = j;
  buffer[i + 1] = 255;
}

