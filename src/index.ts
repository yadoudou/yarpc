import unserialize = require('locutus/php/var/unserialize');
import http = require('http');
import { YarPacket } from './YarPacket';

interface YarClientConf {
    connectTimeOutMs?: number;
    timeOutMs?:number;
    apiUrl: string;
}

class YarClient {
    conf: YarClientConf = {
        apiUrl: null,
        connectTimeOutMs: 10000,
        timeOutMs: 10000
    };
    urlObject: URL = null;

    constructor ( conf: YarClientConf ) {
        this.conf = { ...this.conf, ...conf};
        try {
            this.urlObject = new URL( this.conf.apiUrl );
        } catch ( e ) {
        }
        if ( !this.urlObject || !this.urlObject.host ) {
            throw new Error('invalid rpc api url');
        }
    }

    call ( strMethod: string, arrParmas = [] ) {
        return new Promise( ( resolve, reject ) => {
            let packet = YarPacket.buildRequestPack( strMethod, arrParmas );
            let packetBits = YarPacket.buildBits( packet );
            const options = {
                hostname: this.urlObject.host,
                port: this.urlObject.port || 80,
                path: this.urlObject.pathname,
                method: 'POST',
                timeout: this.conf.timeOutMs,
                headers: {
                    'Host': this.urlObject.host,
                    'Accept': '*/*',
                    'User-Agent': "Node Yarpc Rpc-2.0.5",
                    'Connection': 'close',
                    'Content-Length': packetBits.byteLength,
                    'Content-Type': "application/x-www-form-urlencode"
                }
            }
    
            // create request
            let startTime = Date.now();
            const req = http.request( options, ( res ) => {
                let intUseTime = Date.now() - startTime;
                console.log('request respone', { statusCode: res.statusCode, useTime: intUseTime } );
                res.on('data', (chunk) => {
                    let packet = YarPacket.parse( chunk );
                    let returnInfo = unserialize( packet.body );
                    if ( returnInfo.s !== 0 ) {
                        console.log('rpc return failed', {status: returnInfo.s, message: returnInfo.e, output: returnInfo.o });
                        reject('call rpc failed');
                        return true;
                    }
                    if ( returnInfo.o.length > 0 ) {
                        console.log('rpc return has output', { output: returnInfo.o } );
                    }
                    resolve( returnInfo.r );
                } )
            } )

            // on error
            req.on('error', ( e ) => {
                console.log('request failed', { errMessage: e.message } );
                reject( e );
            } )

            //send buffer
            let buffer = Buffer.from(packetBits.buffer);
            req.write(buffer);
            req.end( () => {
                console.log('send rpc request', {url: this.urlObject.href });
            } );
        } )
    }
}

export { YarClient };