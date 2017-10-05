"use strict";
const
  Net = require('net')
  , {Tools}=require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  , mbeeg = Net.createConnection(config.service.port, config.service.host, () => {
  
  })
;
mbeeg.pipe(process.stdout);
