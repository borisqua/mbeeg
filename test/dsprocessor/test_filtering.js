"use strict";
const
  fs = require('fs'),
  csv = require('csv'),
  dsProcessor = require(`./core/dsvrocessor`);

let
  parser = csv.parse(),
  channel = [];

fs.createReadStream(`data/1.1_epoching/epoch_FZ_1.csv`)
  .pipe(parser);
parser
  .on(`data`, (data) => {
    channel.push(+data[0]);
  })
  .on(`finish`,()=>{
    channel = dsProcessor.butterworth4Bulanov(channel, 250, 25, false);
    channel = dsProcessor.detrend(channel, false);
    console.log(JSON.stringify(channel,null,2));
  });

