"use strict";

const
  Net = require('net')
  , {Tools}=require('mbeeg')
  // , config = Tools.loadConfiguration(`config.json`)
  , config = Tools.loadConfiguration(`../../config.json`)
  , mbeeg = Net.createConnection(config.mbeeg.tcpserver.port, config.mbeeg.tcpserver.host, () => {
  
  })
;

mbeeg.pipe(process.stdout);
