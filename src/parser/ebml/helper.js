// const Debug = require('debug')('mberp:ebml:helper');

/**
 * EBMLHelper class contains tools & helper functions for operation with EBML subjects, such as variable-length integers
 * binary tags, endians etc.
 * @see EBML, variable-length integers, UTF, Endianness
 * **/
class EBMLHelper {
  
  /**
   * vInt function calculates length, value and uint8 buffer of variable-length integer
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @return {{start: number, length: number, buffer: Array.<*>, value: *}} {offset, length, value buffer, value}
   * **/
  static vInt(buffer, offset = 0) {
    let bytes = 0;
    //noinspection StatementWithEmptyBodyJS
    while (!buffer[offset + bytes++]); //bytes with vInt descriptor
    let firstByte = offset + bytes - 1;
    let length = 8 * bytes - (Math.log2(buffer[firstByte]) ^ 0);
    let valueBuffer = buffer.slice(firstByte, firstByte + length - bytes + 1);
    valueBuffer[0] = valueBuffer[0] & (Math.pow(2, 8 - length + (bytes - 1) * 8) - 1);
    //alternative way to calculate length should be used for testing
    // const value = parseInt(this.bigEndian(offset, bytes, buffer), 16); //value in descriptor
    // return Math.ceil(Math.log2(-(1 + ~(1 << bytes * 8)) / value)); //length of vInt
    return {
      start: firstByte,
      length: length,
      buffer: valueBuffer,
      value: this.bigEndian(valueBuffer)
    }
    //TODO there is much much faster approach to get vInt length, it is the precalculated vector with 256 elements (i.e. 2^8 elements)
    // that contain vectors with length equal to number of bytes of length descriptor
    //each element of last vector keeps precalculated length of vInt for that specific length of vInt length descriptor
    //then vInt could be expressed like some thing like this: {let bytes=0; while(!buffer[bytes++]); return table256[buffer[bytes]][bytes];}
    //in that case current implementation of vInt could be used to precalculate table256 before beginning the parsing process
  }
  
  /**
   * bigEndian calculates value from buffer according to big-endian order of bytes
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * @param {number} length length of value in bytes
   * @param {number} offset buffer index of the first byte of the value
   * **/
  static bigEndian(buffer, length = buffer.length, offset = 0) {
    let exp = length - 1;
    if (offset + length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return buffer[offset].toString(16) + (exp === 0 ? "" : this.bigEndian(buffer, exp, offset + 1));
  }
  
  /**
   * littleEndian calculates value from buffer according to little-endian order of bytes
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * @param {number} length length of value in bytes
   * @param {number} offset buffer index of the first byte of the value
   * **/
  static littleEndian(buffer, length, offset = 0) {
    let exp = length - 1;
    if (offset + length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return buffer[offset + exp].toString(16) + (exp === 0 ? "" : this.littleEndian(buffer, exp, offset));
  }
  
}

module.exports = EBMLHelper;