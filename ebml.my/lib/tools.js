
class EBMLTools {

    static bigEndian(buffer, start, length){
      let exp = length - 1;
      if(start+length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
      return buffer[start] * Math.pow(256, exp) + (exp === 0 ? 0 : this.bigEndian(buffer, start + 1, exp));
    }
    
    static littleEndian(buffer, start, length){
      let exp = length - 1;
      if(start+length > buffer.length) throw new Error(`Length out of buffer boundaries: ${length}`);
      return buffer[start + exp] * Math.pow(256, exp) + (exp === 0 ? 0 : this.littleEndian(buffer, start, exp));
    }
    
    static readVInt(buffer, start = 0){
      let vIntDescriptor, vIntMarker, ebmlMaxIdWidth, ebmlMaxSizeWidth;
      //get VInt length
      //get VInt value
    }

    static writeVInt(value){

    }
}

module.exports = EBMLTools;