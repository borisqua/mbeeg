"use strict";
let TagId = require('element');

const {Transform} = require('Transform');
/**
 * class Writer
 * Basic usage of this class consists in :
 *  - Create child node
 *  - Gives information about the node :
 *    - Whether created node is master node
 *        (Goto 1)
 *    - Whether created node is simple child node
 *        (set data for this child node)
 *  - Close opened node
 *
 * The EBML::IWriterHelper class could be used in order
 * to send EBML standard data such as integers, floats,
 * strings, etc...
 */
class Writer extends Transform{
  constructor(options = {}){
    options.writableObjectMode = true;
    super(options);
    
    this._buffer = null;
    this._tag_stack = [];
    this._cursor = 0;
    this._total = 0;
    this._state = STATE_TAG;
    this._dtd = require('dtd');
    this._schema = require(('ebml_types'));
  };
  
  /**
   * Opens new child node of tagID type
   * @param {TagId} tagId Id of the EBML tag
   * @return {boolean} on success returns true, on fail returns false
   */
  openChild(tagId){
    // return false;
  }
  
  /**
   * Adds data to the node if node has appropriate data type
   * @param {number} offset buffer index of the first byte of the variable-length integer
   * @param {Array} buffer buffer or string with data
   * @param size
   */
  setChildData(offset = 0, buffer = this._buffer, size){
  
  }
  
  /**
   *Closes tag
   */
  closeChild(){
  
  }
}