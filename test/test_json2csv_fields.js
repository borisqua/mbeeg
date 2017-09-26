"use strict";
const
  appRoot = require(`app-root-path`)
  , fs = require(`fs`)
  , json2csv = require(`json2csv`)
  , log = require(`${appRoot}/epochs`);

let
  cycle
  , fields = []
  , data = []
;

process.stdout.write(`Please enter the cycle number: `);
// process.stdin.on(`data`, input => {
//   cycle = +input.toString();
cycle = 1;
console.log(cycle);
for (let epoch of log.epochs) {
  if (+epoch.cycle === cycle) {
    for (let chN = 0; chN < epoch.channels.length; chN++) {
      let fieldName = `key${('0' + epoch.key).substr(-2)}::ch${('0' + chN).substr(-2)}`;
      fields.push({key: +epoch.key, channel: chN, fieldName: fieldName, data: epoch.channels[chN]});
      // data.push({key: +epoch.key, channel: chN, data: epoch.channels[chN]});
      process.stdout.write(`${fieldName}=sum(${epoch.channels[chN].reduce((a,b)=>a+b)}) \n`);
    }
    process.stdout.write(`-----------------------------------------------------------\n`);
  }
}
fields.sort((a, b) => { return a.key * 100 + a.channel - b.key * 100 - b.channel; });
data.sort((a, b) => { return a.key * 100 + a.channel - b.key * 100 - b.channel; });
// for (let i = 0; i < data.length; i++) data[i].data = data[i].data.map(i => i * 100000);
fs.createWriteStream(`${appRoot}/epochs.csv`).write(
  json2csv({data: data.map(i => i.data), fields: fields.map(i => i.fieldName)})
);
// });
