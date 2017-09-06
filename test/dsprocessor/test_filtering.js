"use strict";
const
  fs = require(`fs`),
  csv = require(`csv`),
  lib = require(`./core/dsprocessor`);

let
  parser = csv.parse(),
  stringifier = csv.stringify(),
  channel = [];

fs.createReadStream(`data/1.1_epoching/epoch_FZ_1.csv`)
  .pipe(parser);
parser
  .on(`data`, (data) => {
    channel.push(+data[0]);
  })
  .on(`finish`,()=>{
    channel = lib.butterworth4Bulanov(channel, 250, 25, false);
    channel = lib.detrend(channel, false);
    console.log(JSON.stringify(channel,null,2));
  });

