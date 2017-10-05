"use strict";

const dict = require(`./tools/ebml/ebml_dictionary`);

let
  arr = {},
  acc = 0
;
for (let id in dict) {
  acc++;
  if (arr[dict[`${id}`].type] === undefined)
    arr[dict[`${id}`].type] = {quantity: 1, density: 0};
  else
    arr[dict[`${id}`].type].quantity++;
}
for(let t in arr) arr[t].density = arr[t].quantity / acc;
console.log(arr);
