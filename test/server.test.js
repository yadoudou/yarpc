const yarpc = require('../dist/index');
const http = require('http');

class Handler {
    static common( ...params ) {
        return {
            params,
            date: (new Date()).toString(),
            unixTime: Date.now()
        };
    }
}

const server = http.createServer( ( req, res ) => {
    if ( req.method.toLowerCase() !== 'post') {
        res.write('you should request in post method', 'utf8' );
        res.end();
        return true;
    }
    let chunks = [];
    req.on('data', ( chunk ) => {
        chunks.push(chunk);   
    } )
    req.on('end', async () => {
        let buffer = Buffer.concat( chunks );
        let retrunBuffer = await yarpc.YarServer.handle( buffer, Handler );
        res.write( Buffer.from( retrunBuffer.buffer ) );
        res.end();
    })
})
server.listen(8000, () => {
    console.log('start server listening 8000');
})