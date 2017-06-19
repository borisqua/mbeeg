let http = require('http');
let url = require('url');

let server = new http.Server();
server.on('request',(req,res)=>{
    console.log(req.method, req.url);
    console.log(req.headers);
    // WTF();
    let urlParsed = url.parse(req.url, true);
    debugger;

    console.log(urlParsed);

    if(urlParsed.pathname=='/echo' && urlParsed.query.message){
        res.statusCode = 200;
        res.writeHead(200, 'OK', {'Cache-control': 'no-cache, no-store, must-revalidate'});//immediate header setting
        // res.setHeader('Cache-control', 'no-cache, no-store, must-revalidate');//deferred (with next connection) header setting
        res.end(urlParsed.query.message);
    }else{
        res.statusCode = 404;
        res.end("Page not found");
    }

});

server.listen(1337, '127.0.0.1');
console.log('Server is running');
/*let counter = 0;

let emit = server.emit;
server.emit = function (event) {
    console.log(event);
    emit.apply(server, arguments);
};

server.on('request', (req, res) => res.end("Hello world!"+ counter++));*/
