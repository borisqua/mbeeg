"use strict";

const
  appRoot = require(`app-root-path`),
  Tools = require(`${appRoot}/src/tools/helpers`).mbTools,
  ebmlDictionary = require(`${appRoot}/src/tools/ebml/ebml_dictionary`)
;

/**
 * @class EBMLReader describes stream object that receives ebml binary stream and its callback function
 * that extracts pure binary ebml elements, and then provide Readable stream interface with
 * ebml parsed to openViBE stream objects in json format
 */
class EBMLReader extends require(`stream`).Transform {
  constructor({
                ebmlSource, //some input stream e.g. TCP or fs readable stream
                ebmlCallback, //input stream parser. It should return pure & aligned ebml byte-stream
                objectMode = true
              }) {
    // options.readableObjectMode = true;
    super({objectMode: true});
    
    this.objectMode = objectMode;
    this._buffer = null;
    this._level = 0;
    this._cursor = 0;
    this._prevCursor = 0;
    this._ebml = {};
    
    ebmlSource.on(`data`, data => ebmlCallback(this, data));
    
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, cb) {
    //first - add new portion of data to buffer
    if (this._buffer === null) {
      this._buffer = Buffer.from(chunk);
    } else {
      this._buffer = Buffer.concat([this._buffer, chunk]);
    }
    //then parsing cycle
    while (this._cursor < this._buffer.length) {
      let element = this._openElement();
      this._ebml[`${element.name}`] = element.content;
      if (!this._ebml) break;
      this._ebml.timestamp = {value: 0};//original ov stream object doesn't have timing information
      this._ebml.timestamp.value = new Date().getTime();
      if (this.objectMode)
        cb(null, this._ebml);//do some work after parsing has finished
      else
        cb(null, `${JSON.stringify(this._ebml, null, 2)}\n`);
      // console.log(JSON.stringify(this._ebml, null, 2));
    }
    // cb();
  }
  
  /**
   *
   * @return {boolean || {start: number, length: number, buffer: Array.<*>, value: *}}
   */
  _readTag() {
    if (this._cursor >= this._buffer.length) {
      console.log('waiting for more data...');
      this._cursor = this._prevCursor;
      return false;
      
    }
    
    let tag = Tools.vInt(this._buffer, this._cursor);
    tag.start = this._cursor;
    
    this._prevCursor = this._cursor;
    this._cursor += tag.length;
    
    return tag;
  }
  
  /**
   *
   * @param size
   * @param type
   */
  _readData(size, type) {
    
    let dataBuffer = this._buffer.slice(this._cursor, this._cursor + size);
    this._prevCursor = this._cursor;
    this._cursor += size;
    switch (type) {
      // case `INT`://(in accordance to EBML specification name should be INT = *8BYTE)
      case `uinteger`://38 - this is absolute frequency per current dictionary (in accordance to EBML specification name should be UINT = *8BYTE
        return {value: dataBuffer.readUIntBE(0, size), buffer: dataBuffer};//this._cursor);
      case `string`://6(in accordance to EBML specification name should be STRING = *BYTE *PADDING where PADDING = %x00)
        return {value: dataBuffer.toString(), buffer: dataBuffer};
      case `float`://3(in accordance to EBML specification name should be FLOAT = *1(4BYTE / 8BYTE / 10BYTE) )
        return {value: dataBuffer.readFloatBE(0, size), buffer: dataBuffer};
      case `binary(float32)`://1(in accordance to EBML specification name should be BINARY = *BYTE information about internal structure and data types can be passed in outer container tags)
      case `binary(float64)`://2(in accordance to EBML specification name should be BINARY = *BYTE information about internal structure and data types can be passed in outer container tags)
      case `binary`://3(in accordance to EBML specification name should be BINARY = *BYTE information about internal structure and data types can be passed in outer container tags but mustn't be interpreted)
        return {value: `matrix`, buffer: dataBuffer};
      case `date`://1
        return {value: new Date(dataBuffer.readUIntBE(0, size)), buffer: dataBuffer};
      default://39 type `master` in current openViBE notation in must occasions, or, no matter how it named, this is container tag
        return false;
    }
  }
  
  /**
   * This function is called when parser has started new EBML node parsing.
   * It gets element information and decide what next to do whether get data or recursive descend to next child
   */
  _openElement() {
    //if element type isn't data type then open nested element (recursive call of _openElement)
    //else pass element data to callback object that knows what to do with data of that element type
    let
      elementId = this._readTag(),
      elementSize = this._readTag();
    if (!elementId || !elementSize) return null;
    
    let
      id = Tools.deleteLeadZeros(elementId.hexString).toUpperCase(),
      // id = elementId.hexString.toUpperCase(),
      name = ebmlDictionary[id].name,
      type = ebmlDictionary[id].type,
      size = parseInt(elementSize.hexString, 16),
      // data = !!size && type !== `master` ? this._readData(size, type) : null,
      ebml = {}
    ;
    // ebml.push({name: name, type: type, size: size, content: []});
    ebml[`${name}`] = {type: type, size: size};
    // console.log(ebml);
    // console.log(`C:${this._cursor} ### ${'\t'.repeat(this._level)}${id} ${name} : ${type.toUpperCase()} Size: == 0x${elementSize.hexString} == ${size}`);
    
    switch (type) {
      // case `INT`://(in accordance to EBML specification the name should be INT = *8BYTE)
      case `uinteger`://38 - this is absolute frequency per current dictionary (in accordance to EBML specification the name should be UINT = *8BYTE
      case `string`://6(in accordance to EBML specification the name should be STRING = *BYTE *PADDING where PADDING = %x00)
      case `float`://3(in accordance to EBML specification the name should be FLOAT = *1(4BYTE / 8BYTE / 10BYTE) )
      case `binary(float32)`://1(in accordance to EBML specification the name should be BINARY = *BYTE. Information about internal structure and data types can be passed in outer container tags)
      case `binary(float64)`://2(in accordance to EBML specification the name should be BINARY = *BYTE. Information about internal structure and data types can be passed in outer container tags)
      case `binary`://3(in accordance to EBML specification the name should be BINARY = *BYTE. Information about internal structure and data types can be stored in outer container tag but mustn't be interpreted at the EBML level)
      case `date`://1(in accordance to EBML specification the name should be DATE = 8BYTE)
        let content = this._readData(size, type);
        ebml[`${name}`].value = content.value;
        ebml[`${name}`].buffer = content.buffer;
        // console.log(ebml);
        break;
      default://39 type `master` in current openViBE notation in most occasions, or, no matter how it named, this is container tag
        let tagSpan = this._cursor + size;
        this._level++;
        while (this._cursor < tagSpan) {
          let element = this._openElement();
          if (ebml[`${name}`][`${element.name}`] === undefined)
            ebml[`${name}`][`${element.name}`] = element.content;
          else if (Array.isArray(ebml[`${name}`][`${element.name}`]))
            ebml[`${name}`][`${element.name}`].push(element.content);
          else {
            ebml[`${name}`][`${element.name}`] = [ebml[`${name}`][`${element.name}`]];
            ebml[`${name}`][`${element.name}`].push(element.content);
          }
        }
        this._level--;
    }
    
    // if (ebml[`${name}`].content.value !== undefined)
    //   console.log(`C:${this._cursor} ### ${'\t'.repeat(this._level + 2)} Data: ${ebml[`${name}`].content.value}<=>${JSON.stringify(ebml[`${name}`].content.buffer, null/*, 2*/)}`);//C:${this._cursor} ###
    // return {name: name, type: type, size: size, content: ebml[`${name}`].content};
    return {name: name, content: ebml[`${name}`]};
    /*  Типы большинства элементов можно найти в файле plugins\processing\tools\share\config-ebml-stream-spy.txt.
        Типы binary(float64) и binary(float32) означают, что на уровне EBML данные не парсятся (тип binary),
      а на уровне OpenViBE содержат массивы чисел float64 и float32 соответственно. При этом порядок байт
      в числах от младшего к старшему (little-endian), в отличие от формата EBML, где байты в данных типа float
      расположены в порядке от старшего к младшему (big-endian)*/
  }
}

module.exports = EBMLReader;
