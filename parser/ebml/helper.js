/**
 * EBMLHelper class contains tools & helper functions for operation with EBML subjects, such as variable-length integers
 * binary tags, endians etc.
 * @see EBML, variable-length integers, UTF, Endianness
 * **/
class EBMLHelper {
  
  /**
   * vIntLength function calculates length of variable-length integer
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * **/
  static vIntLength(offset = 0, buffer){
    let bytes = 0;
    //noinspection StatementWithEmptyBodyJS
    while (!buffer[offset+bytes++]); //bytes with vInt descriptor
    return 8 * bytes - (Math.log2(buffer[offset+bytes - 1]) ^ 0);
    //alternative way to calculate length should be used for testing
    // const value = parseInt(this.bigEndian(offset, bytes, buffer), 16); //value in descriptor
    // return Math.ceil(Math.log2(-(1 + ~(1 << bytes * 8)) / value)); //length of vInt
    
    //TODO there is much much faster approach to get vInt length, it is the precalculated vector with 256 elements (i.e. 2^8 elements)
    // that contain vectors with length equal to number of bytes of length descriptor
    //each element of last vector keeps precalculated length of vInt for that specific length of vInt length descriptor
    //then vIntLength could be expressed like some thing like this: {let bytes=0; while(!buffer[bytes++]); return table256[buffer[bytes]][bytes];}
    //in that case current implementation of vIntLength could be used to precalculate table256 before beginning the parsing process
  }
  
  /**
   * bigEndian calculates value from buffer according to big-endian order of bytes
   * @param {number} offset buffer index of the first byte of the value
   * @param {number} length length of value in bytes
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * **/
  static bigEndian(offset = 0, length = 1, buffer) {
    let exp = length - 1;
    if (offset + length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return buffer[offset].toString(16) + (exp === 0 ? "" : this.bigEndian(offset + 1, exp, buffer));
  }
  
  /**
   * littleEndian calculates value from buffer according to little-endian order of bytes
   * @param {number} offset buffer index of the first byte of the value
   * @param {number} length length of value in bytes
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * **/
  static littleEndian(offset, length, buffer) {
    let exp = length - 1;
    if (offset + length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return buffer[offset + exp].toString(16) + (exp === 0 ? "" : this.littleEndian(offset, exp, buffer));
  }
  
}

module.exports = EBMLHelper;