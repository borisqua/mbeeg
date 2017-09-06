"use strict";

let
  result = {},
  onmessage = (e) => {
    switch (e.command) {
      case `run`:
        break;
      case `pause`:
        break;
      case `close`:
        close();
        break;
    }
    postMessage(result);
  };
