'use strict';
let TagId = require('parser/ebml/tag');

const
  { Transform } = require("stream"),
  STATE_TAG = Symbol('TAG'),
  STATE_SIZE = Symbol('SIZE'),
  STATE_CONTENT = Symbol('CONTENT');

class Reader extends Transform {
  constructor(options = {}) {
    options.readableObjectMode = true;
    super(options);
    
    this._buffer = null;
    this._tag_stack = [];
    this._cursor = 0;
    this._total = 0;
    this._state = STATE_TAG;
    this._dtd = require('parser/ebml/dtd');
    this._schema = require(('ebml_types'));
  }
  
  _transform(buffer = this._buffer, encoding, callback) {
    //first - add new portion of data to buffer
    if (this._buffer === null) {
      this._buffer = buffer;
    } else {
      this._buffer = Buffer.concat([this._buffer, chunk]);
    }
    //then parsing cycle
    while (this._cursor < this._buffer.length) {
      if (this._state === STATE_TAG && !this.readTag()) {
        break;
      }
      if (this._state === STATE_SIZE && !this.readSize()) {
        break;
      }
      if (this._state === STATE_CONTENT && !this.readContent()) {
        break;
      }
    }
    
    callback();
  }
  
  /**
   * Whether tag with id === tagId is tag of data container or parent for other children tags
   * @param {TagId} tagId Identity of tag from schema.json for selected model of EBML
   * @return {boolean} if it is data container returns true else false
   */
  isData(tagId){
    return false;
  }
  
  /**
   * This function is called when parser has started new EBML node parsing
   * @param {TagId} tagId Identity of tag from schema.json for selected model of EBML
   */
  openTag(tagId){
  
  }
  
  processTagData(chunk, length){
  
  }
  
  readTag(){
     if (this._cursor >= this._buffer.length) {
        debug('waiting for more data');
        return false;
    }

    const start = this._total;
    const tag = tools.readVint(this._buffer, this._cursor);

    if (tag == null) {
        debug('waiting for more data');
        return false;
    }

    const tagStr = this._buffer.toString('hex', this._cursor, this._cursor + tag.length);

    this._cursor += tag.length;
    this._total += tag.length;
    this._state = STATE_SIZE;

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
   * This function tells whether content type of tag with id === TagId is data
   * or this tag is container for child elements
   * @param {TagId} tagId Id of the EBML tag
   */
  isData(tagId){
  
  }
}

module.exports = Reader;
