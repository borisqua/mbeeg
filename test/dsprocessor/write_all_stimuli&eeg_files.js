"use strict";
const {spawn} = require(`child_process`);
let a = [...new Array(4).keys()].map(i => [...new Array(5).keys()].map(i => 0));
for (let d = 1; d < 5; d++) {
  for (let f = 1; f < 6; f++) {
    a[d - 1][f - 1] = spawn(`node`, ['write_input_files.js', `${d}`, `${f}`]);
    a[d - 1][f - 1].stdout.on(`data`, (data) => {
      console.log(`stdout ${d}/${f}: ${data}`);
    });
    a[d - 1][f - 1].stderr.on(`data`, (data) => {
      console.log(`stderr ${d}/${f}: ${data}`);
    });
    a[d - 1][f - 1].on(`close`, (code) => {
      console.log(`child process ${d}/${f} finished with exit code: ${code}`);
    });
  }
}

