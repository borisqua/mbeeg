"use strict";
const Helper = require("helper");

/**
 * EBML ReaderHelper class contains tools & helper functions for reading EBML file or stream, parse it and then send it
 * to users callback function that should know what to do with parsed data
 * @see EBML, variable-length integers, UTF, Endianness
 * **/
class ReaderHelper extends Helper {
  
  constructor(buffer) {
    super(buffer);
  }
  
  /**
   * takeIdVInt calculates variable-length integer value from buffer
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * **/
  takeIdVInt(offset = 0, buffer = this.buffer) {
    let length = this.vIntLength(offset, buffer);
    return {
      length: length,
      value: this.bigEndian(offset, length, buffer) // % Math.pow(2,length*8)
    };
  }
  
  /*yieldVInt(value) {
   
   }*/
}