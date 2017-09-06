"use strict";

const
  appRoot = require(`app-root-path`),
  Tools = require(`${appRoot}/src/tools/helpers`),
  ebmlDictionary = require(`${appRoot}/src/tools/parser/ebml/ebml_dictionary`)
;

class Reader extends require(`stream`).Transform {
  constructor({
                // ebmlSource, //some input stream e.g. TCP or fs readable stream
                // ebmlSourceOnDataCallback, //input stream parser should return pure & aligned ebml byte-stream
    
              }) {
    // options.readableObjectMode = true;
    super({objectMode: true});
    
    this._buffer = null;
    this._level = 0;
    this._cursor = 0;
    this._prevCursor = 0;
    // this._dtd = require('./dtd.json');
    // this._schema = require(('./ebml_types'));
    // ebml.on(`data`, chunk => {
    // });
  }
  
  // noinspection JSUnusedGlobalSymbols
  _transform(chunk, encoding, callback) {
    //first - add new portion of data to buffer
    if (this._buffer === null) {
      this._buffer = Buffer.from(chunk);
    } else {
      this._buffer = Buffer.concat([this._buffer, chunk]);
    }
    //then parsing cycle
    while (this._cursor < this._buffer.length) {
      this._openElement();
    }
    callback();//do some work after parsing has finished
  }
  
  /**
   *
   * @return {null || {start: number, length: number, buffer: Array.<*>, value: *}}
   */
  _readTag() {
    if (this._cursor >= this._buffer.length) {
      console.log('waiting for more data...');
      this._cursor = this._prevCursor;
      return null;
      
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
    this._cursor += size;
    switch (type) {
      case `master`://39
        break;
      case `uinteger`://38
        return {value: dataBuffer.readUIntBE(0, size), buffer: dataBuffer};//this._cursor);
      case `string`://6
        return {value: dataBuffer.toString(), buffer: dataBuffer};
      case `float`://3
        return {value: dataBuffer.readFloatBE(0, size), buffer: dataBuffer};
      case `binary`://3
        return {value: `matrix`, buffer: dataBuffer};
      case `binary(float64)`://2
        return {value: `matrix`, buffer: dataBuffer};
      case `binary(float32)`://1
        return {value: `matrix`, buffer: dataBuffer};
      case `date`://1
        return {value: new Date(dataBuffer.readUIntBE(0, size)), buffer: dataBuffer};
    }
    
    return null;
  }
  
  /**
   * This function is called when parser has started new EBML node parsing.
   * It gets element information and decide what next to do whether get data or recursive descend to next child
   */
  _openElement() {
    let
      elementId = this._readTag(),
      elementSize = this._readTag();
    if (!elementId || !elementSize) return null;
    let
      id = Tools.deleteLeadZeros(elementId.hexString).toUpperCase(),
      name = ebmlDictionary[id].name,
      type = ebmlDictionary[id].type,
      size = parseInt(elementSize.hexString, 16),
      data = !!size && type !== `master` ? this._readData(size, type) : null
    ;
    console.log(`C:${this._cursor} ### ${'\t'.repeat(this._level)}${id} ${name} : ${type.toUpperCase()} Size: == 0x${elementSize.hexString} == ${size}`);
    if (type === `master`) {
      let tagSpan = this._cursor + size;
      this._level++;
      while (this._cursor < tagSpan) {
        this._openElement();
      }
      this._level--;
    } else if (data) {
      console.log(`C:${this._cursor} ### ${'\t'.repeat(this._level + 2)} Data: ${data.value}<=>${JSON.stringify(data.buffer, null/*, 2*/)}`);//C:${this._cursor} ###
    }
    //if element type isn't data type then open nested element (recursive call of _openElement)
    //else pass element data to callback object that knows what to do with data of that element type
    /*  Типы большинства элементов можно найти в файле plugins\processing\tools\share\config-ebml-stream-spy.txt.
        Типы binary(float64) и binary(float32) означают, что на уровне EBML данные не парсятся (тип binary),
      а на уровне OpenViBE содержат массивы чисел float64 и float32 соответственно. При этом порядок байт
      в числах от младшего к старшему (little-endian), в отличие от формата EBML, где байты в данных типа float
      расположены в порядке от старшего к младшему (big-endian)*/
  }
}

module.exports = Reader;
