'use strict';
// let {expect, assert, should} = require('chai');
// let assert = require('assert');

let Helper = require('../ebml/helper');
let
  ebmlHelper,
  hexString,
  strBuffer,
  buffer = [],
  start = 0,
  length = 8;

hexString = '01 2B 39 5F 10 8A DF AE';
strBuffer = hexString.split(' ');
strBuffer.forEach((element) => {
  buffer.push(parseInt(element, 16));
});

ebmlHelper = new Helper(buffer);
describe('EBMLHelper class', () => {
  describe('Variable Int', () => {
    for (let i = 0; i < 3; i++) {
      let j, value, alternativeLengthCalculation;
      for (j = 255; j > 0; j--) {
        buffer[i] = j;
        length = i + 1;
        value = parseInt(ebmlHelper.bigEndian(start, length, buffer), 16); //value in descriptor
        alternativeLengthCalculation = Math.ceil(Math.log2(-(1 + ~(1 << (i+1) * 8)) / value)); //length of vInt
        console.log(`${255*i+256-j}. buffer = [${buffer}] vIntLength == ${ebmlHelper.vIntLength(start, buffer)} == ${alternativeLengthCalculation}`);
        if(ebmlHelper.vIntLength(0, buffer) !== alternativeLengthCalculation) debugger;
        // it(`vIntLength(0, ${buffer})`, () => {
        //   expect(ebmlHelper.vIntLength(start, buffer)).to.equals(alternativeLengthCalculation);
        // });
      }
      buffer[i] = j;
      buffer[i + 1] = 255;
    }
  });
/*  describe('Endian strings', () => {
    it('bigEndian(start, length) Calculate big endian number from buffer', () => {
      // assert.equal(ebmlHelper.bigEndianString(start, length), '012b395f108adfae'); //assert from node
      expect(ebmlHelper.bigEndian(start, length)).to.equals('12b395f108adfae'); //assert,expect,should from chai
    });
    it('littleEndian(start, length) Calculate little endian number from buffer(start,length)', () => {
      // assert.equal(ebmlHelper.littleEndianString(start, length),'aedf8a105f392b1'); //assert from node
      expect(ebmlHelper.littleEndian(start, length)).to.equals('aedf8a105f392b1'); //assert,expect,should from chai
    })
  });*/
});

