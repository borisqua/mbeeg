"use strict";
const
  Debug = require('debug')('mberp:ebml:reader'),
  ElementId = require('./element'),
  {Transform} = require("stream"),
  Tools = require('./helper'),
  ELEMENT_ID = Symbol('ELEMENT_ID'),
  ELEMENT_SIZE = Symbol('ELEMENT_SIZE'),
  ELEMENT_DATA = Symbol('ELEMENT_DATA');

class Reader extends Transform {
  constructor(options = {}) {
    options.readableObjectMode = true;
    super(options);
    
    this._buffer = null;
    this._element_stack = [];
    this._cursor = 0;
    this._total = 0;
    this._dtd = require('./dtd.json');
    // this._schema = require(('./ebml_types'));
  }
  
  _transform(chunk, encoding, callback) {
    //first - add new portion of data to buffer
    if (this._buffer === null) {
      this._buffer = chunk;
    } else {
      this._buffer = Buffer.concat([this._buffer, chunk]);
    }
    //then parsing cycle
    while (this._cursor < this._buffer.length) {
      this.openElement();
    }
    callback();//do some work arter parsing has finished
  }
  
  /**
   *
   * @return {{length: *, value: (*)}}
   */
  readTag(mode) {
    if (this._cursor >= this._buffer.length) {
      Debug('waiting for more data...');
      return {value: null, length: null};
    }
    
    let tag = Tools.vInt(this._buffer, this._cursor);
    tag.start = this._cursor;
    
    this._cursor += tag.length;
    this._total += tag.length;
    
    return tag;
  }
  
  /**
   * This function is called when parser has started new EBML node parsing.
   * It gets element information and decide what next to do whether get data or recursive descend to next child
   * @param {{length: *, value: (*)}} tag descriptor contains Id and Length of ID
   */
  openElement() {
    //get element id information
    let elementId = this.readTag(ELEMENT_ID);
    //get size information
    let elementSize = this.readTag(ELEMENT_SIZE);
    Debug(`Element Id: `);
    Debug(elementId);
    Debug(`Element size:`);
    Debug(elementSize);
  
  //if element type isn't data type then open nested element (recursive call of openElement)
  //else pass element data to callback object that knows what to do with data of than element type
  /*  Типы большинства элементов можно найти в файле plugins\processing\tools\share\config-ebml-stream-spy.txt.
      Типы binary(float64) и binary(float32) означают, что на уровне EBML данные не парсятся (тип binary),
    а на уровне OpenViBE содержат массивы чисел float64 и float32 соответственно. При этом порядок байт
    в числах от младшего к старшему (little-endian), в отличие от формата EBML, где байты в данных типа float
    расположены в порядке от старшего к младшему (big-endian)*/
}

/**
 * Is element is data container or parent for other children elements
 * @param {ElementId} elementId Identity of element from schema.json for selected model of EBML
 * @return {boolean} true if it is data container, otherwise false
 */
isData(elementId)
{
  return false;
}

/**
 * This function tells whether content type of element with id === ElementId is data
 * or this element is container for child elements
 * @param {ElementId} elementId Id of the EBML element
 */
isDataElement(elementId)
{
  
}

/**
 *@param chunk
 *@param length
 */
processElementData(chunk, length)
{
  
}

/**
 * Closes last opened element in EBML hierarchy
 */
closeElement()
{
  
}
  
}

module.exports = Reader;
