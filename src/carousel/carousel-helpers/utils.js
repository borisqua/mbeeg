function pad(l, v) {// l - length of zero-leading string number, v - number value
  return new Array(l).fill(0).concat(v).join('').substr(v.toString().length > l ? -v.toString().length : -l);
}

