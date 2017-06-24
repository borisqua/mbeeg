'use strict';
const
  ElementId = require('./element'),
  {Transform} = require("stream"),
  Tools = require('./readerhelper');

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
      this.openElement(this.readTag());
    }
    callback();//do some work with client callback when parsing has finished
  }
  
  /**
   * This function is called when parser has started new EBML node parsing.
   * It gets element information and decide what next to do whether get data or recursive descend to next child
   * @param {ElementId} elementId Identity of element from schema.json for selected model of EBML
   */
  openElement(elementId) {
    //first get element data by element
    //if element type isn't data type then open nested element (recursive call of openElement)
    //else pass element data to callback object that knows what to do with data of than element type
  }
  
  /**
   * Whether element with id === elementId is data container or parent for other children elements
   * @param {ElementId} elementId Identity of element from schema.json for selected model of EBML
   * @return {boolean} if it is data container returns true else false
   */
  isData(elementId) {
    return false;
  }
  
  /**
   *@param chunk
   *@param length
   */
  processElementData(chunk, length) {
  
  }
  
  /**
   * Closes last opened element in EBML hierarchy
   */
  closeElement() {
  
  }
  
  /**
   * takeIdVInt calculates variable-length integer value from buffer
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @param {Array} buffer stream buffer or string that contains variable-length integers of EBML stream or file
   * **/
  static takeIdVInt(offset = 0, buffer = this.buffer) {
    let length = this.vIntLength(offset, buffer);
    return {
      length: length,
      value: this.bigEndian(offset, length, buffer) // % Math.pow(2,length*8)
    };
  }
  
  readTag() {
    if (this._cursor >= this._buffer.length) {
      debug('waiting for more data');
      return false;
    }
    
    const start = this._total;
    const tag = Tools.takeVInt(this._buffer, this._cursor);
    
    if (tag == null) {
      debug('waiting for more data');
      return false;
    }
    
    const tagStr = this._buffer.toString('hex', this._cursor, this._cursor + tag.length);
    
    this._cursor += tag.length;
    this._total += tag.length;
    
    let tagObj = {
      tag: tag.value,
      tagStr: tagStr,
      type: this.getSchemaInfo(tagStr).type,
      name: this.getSchemaInfo(tagStr).name,
      start: start,
      end: start + tag.length
    };
    
    this._tag_stack.push(tagObj);
    debug('read tag: ' + tagStr);
    
    return true;
  }
  
  /**
   * This function tells whether content type of element with id === ElementId is data
   * or this element is container for child elements
   * @param {ElementId} elementId Id of the EBML element
   */
  isDataElement(elementId) {
  
  }
}

module.exports = Reader;
