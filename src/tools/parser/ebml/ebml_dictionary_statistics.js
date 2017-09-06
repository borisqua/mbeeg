"use strict";

const dict = require(`./ebml_dictionary`);

let arr = [];
for (let id in dict) {
  if (arr[dict[`${id}`].type] === undefined)
    arr[dict[`${id}`].type] = 1;
  else
    arr[dict[`${id}`].type]++;
}
console.log(arr);
