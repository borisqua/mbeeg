"use strict";

const
  Net = require('net')
  , {Tools}=require('mbeeg')
  , config = Tools.loadConfiguration(`config.json`)
  // , config = Tools.loadConfiguration(`../../config.json`)
  , mbeeg = Net.createConnection(config.tcpserver.port, config.tcpserver.host, () => {
  
  })
;

mbeeg.pipe(process.stdout);
