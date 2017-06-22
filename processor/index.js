const client = require('net').Socket();
const transform = require('stream').Transfom;
// let tcp =dd require('net');
const tools = require('../parser/ebml/helper');
const decoder = require('../parser/ebml/reader');

"use strict";

client.connect(1024, '127.0.0.1', () => {
  console.log('Connected');
});

client.on('data', (data) => {
  //first we should get tcp chunk size (tcpChunkSize) and then write to tcpChunk tcp data of that size by getting it
  let tcpChunkSize = tools.littleEndian(data, 0, 8);
  let actualSize = data.length - 8;
  //from next bytes of current and next tcp chunks until tcpChunkSize will be completed
  //when tcpChunk will be completed it should be passed to decoder - decoder.write(tcpChunk)
  
  let tcpChunk = data;
  
  // if (this._buffer === null) {
  //   this._buffer = chunk;
  // } else {
  //   this._buffer = Buffer.concat([this._buffer, chunk]);
  // }
  console.log(`chunk size? ${tcpChunkSize} actual size ${actualSize}`);
  console.log(data);
});

client.on('close', () => {
  console.log('Connection closed');
});