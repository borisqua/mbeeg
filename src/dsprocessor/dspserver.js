"use strict";
const {Transform} = require('stream');
const dsprocessor = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback){
    // digital signal processing
    // 1. epoching
    // 2. filtering
    // 3. detrending
    // 4. reshaping
  }
});

if (!module.parent) { //using as standalone tcp service
  
  const server = require('net').createServer((connection) => {
    
    console.log('client connected');
    
    connection.on('end', () => {
      console.log('client disconnected');
    });
  
    connection.on('data', (data) => {
      console.log('data processing starts');
      console.log(data);
    });
  
    connection.pipe(connection);//pipe(processor).pipe(socket);
    //processor.pipe(socket);
  });
  
  server.on('error', (err) => {
    throw err;
  });
  
  server.listen(2048, () => {
    console.log('server listening...');
  });
}

