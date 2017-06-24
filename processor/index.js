const
  Debug = require('debug')('processor'),
  Client = require('net').Socket(),
  Tools = require('../parser/ebml/helper'),
  Reader = require('../parser/ebml/reader');


"use strict";

Client.connect(1024, '127.0.0.1', () => {
  Debug('Connected');
});

let reader = new Reader();
let tcpChunk = new Buffer([]);
let tcpChunkSize = 0;

Client.on('data', (data) => {
  //first we should get tcp chunk size (tcpChunkSize) and then write to tcpChunk tcp data of that size
  if (!tcpChunkSize) {
    tcpChunkSize = parseInt(Tools.littleEndian(0, 8, data), 16);
    data = data.slice(8);//trim TCP header, so tcpChunk is pure EBML data
  }
  let actualSize = data.length;
  Debug('========================================================');
  Debug(`TCP chunk size - ${tcpChunkSize}; raw data size without header - ${actualSize} `);
  Debug('raw data:');
  
  if (actualSize && tcpChunkSize) {
    if (actualSize <= tcpChunkSize) {
      tcpChunkSize -= actualSize;
      tcpChunk = Buffer.concat([tcpChunk, data]);
      Debug(data);
      Debug('........................................................');
      Debug(`trimmed data size: ${tcpChunk.length}`);
      Debug(`trimmed data:`);
      Debug(tcpChunk);
      Debug('========================================================');
      if (!tcpChunkSize) {
        // reader.write(tcpChunk);
        tcpChunk = new Buffer([]);
      }
    }
    else if (actualSize > tcpChunkSize)
      throw new Error("Input stream error. Last tcp chunk is jammed - incorrect length of.");
  }
  
  
});

Client.on('close', () => {
  Debug('Connection closed');
});