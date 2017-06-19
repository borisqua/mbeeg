class EBMLHelper {
  constructor(buffer) {
    const ebmlDTD = require('../ebml/dtd.json');
    this._maxIdWidth = ebmlDTD.header.EBMLMaxIDWidth;
    this._maxSizeWidth = ebmlDTD.header.EBMLMaxSizeWidth;
    this.buffer = buffer;
    let modulo8 = this._maxIdWidth % 8;
    this._ebmlMaxIdDescriptorBytesNumber = (this._maxIdWidth - modulo8) / 8 + !!modulo8;
    modulo8 = this._maxSizeWidth % 8;
    this._ebmlMaxSizeDescriptorBytesNumber = (this._maxSizeWidth - modulo8) / 8 + !!modulo8;
  }
  
  vIntLength(start = 0, bytesNumber = 1){
    const value = this.bigEndian(start, bytesNumber);
    return Math.floor(Math.log2((-1 - ~(1 << bytesNumber * 8)) / value) + 1);
  }
  
  vIntIdLength(start = 0){
    return this.vIntLength(start, this._ebmlMaxIdDescriptorBytesNumber);
  }
  
  vIntSizeLength(start = 0){
    return this.vIntLength(start, this._ebmlMaxSizeDescriptorBytesNumber);
  }
  
  bigEndian(start, length) {
    let exp = length - 1;
    if (start + length > this.buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return this.buffer[start] * Math.pow(256, exp) + (exp === 0 ? 0 : this.bigEndian(start + 1, exp));
  }
  
  bigEndianString(start, length) {
    let exp = length - 1;
    if (start + length > this.buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return this.buffer[start].toString(16) + (exp === 0 ? "" : this.bigEndianString(start + 1, exp));
  }
  
  littleEndian(start, length) {
    let exp = length - 1;
    if (start + length > this.buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return this.buffer[start + exp] * Math.pow(256, exp) + (exp === 0 ? 0 : this.littleEndian(start, exp));
  }
  
  littleEndianString(start, length) {
    let exp = length - 1;
    if (start + length > this.buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
    return this.buffer[start + exp].toString(16) + (exp === 0 ? "" : this.littleEndianString(start, exp));
  }
  
  takeIdVInt(start = 0) {
    let length = this.vIntIdLength(start);
    return {
      length: length,
      value: this.bigEndian(start, length) // % Math.pow(2,length*8)
    };
  }
  
  yieldVInt(value) {
  
  }
}

module.exports = EBMLHelper;