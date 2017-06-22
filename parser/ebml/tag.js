"use strict";

class TagID{
  /**
   * @return {string}
   */
  constructor(options={}){
    if(options.tagId)
      return options.tagID.toString(16);
    else if(options.ui32id_hi || options.ui32id_lo)
      return options.ui32id_hi.toString(16) + options.ui32id_lo.toString(16);
  }
}