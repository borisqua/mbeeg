"use strict";
const Helper = require("helper");

/**
 * EBML WriterHelper class contains tools & helper functions for writing to buffer using EBML tags,
 * with accordance to EBML rules, user Callback function (WriterCallback) get data from buffer and process it.
 * @see EBML, variable-length integers, UTF, Endianness
 * **/
class ReaderHelper extends Helper {
  
  constructor(buffer) {
    super(buffer);
  }
  
  /**
   * yieldIdVInt calculates variable-length integer value from buffer
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * **/
  yieldIdVInt(offset = 0, buffer = this.buffer) {
    let length = this.vIntLength(offset, buffer);
    return {
      length: length,
      value: this.bigEndian(offset, length, buffer) // % Math.pow(2,length*8)
    };
  }
}
