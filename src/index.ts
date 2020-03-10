import unserialize = require('locutus/php/var/unserialize');
import http = require('http');
import Log from '@yadou/yalog';
import { YarPacket } from './YarPacket';
import { Buffer } from 'buffer';

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
                hostname: this.urlObject.hostname,
                port: this.urlObject.port || 80,
                path: this.urlObject.pathname,
                method: 'POST',
                timeout: this.conf.timeOutMs,
                headers: {
                    'Host': this.urlObject.hostname,
                    'Accept': '*/*',
                    'User-Agent': "Node Yarpc Rpc-2.0.5",
                    'Connection': 'close',
                    'Content-Length': packetBits.byteLength,
                    'Content-Type': "application/octet-stream"
                }
            }
    
            // create request
            let startTime = Date.now();
            const req = http.request( options, ( res ) => {
                let intUseTime = Date.now() - startTime;
                Log.trace('request respone', { statusCode: res.statusCode, useTime: intUseTime } );
                let buffers = []
                res.on('data', (chunk) => { 
                    buffers.push(chunk);
                } )
                res.on('end', () => {
                    let buffer = Buffer.concat( buffers );
                    let packet = YarPacket.parse( buffer );
                    let returnInfo = unserialize( packet.body );
                    if ( !returnInfo ) {
                        reject('call rpc failed');
                        return false;
                    }
                    if ( returnInfo.s !== 0 ) {
                        Log.warning('rpc return failed', {status: returnInfo.s, message: returnInfo.e, output: returnInfo.o });
                        reject('call rpc failed');
                        return false;
                    }
                    if ( returnInfo.o && returnInfo.o.length > 0 ) {
                        Log.warning('rpc return has output', { output: returnInfo.o } );
                    }
                    resolve( returnInfo.r );
                })
            } )

            // on error
            req.on('error', ( e ) => {
                Log.warning('request failed', { errMessage: e.message } );
                reject( e );
            } )

            //send buffer
            let buffer = Buffer.from(packetBits.buffer);
            req.write(buffer);
            req.end( () => {
                Log.trace('send rpc request', {url: this.urlObject.href });
            } );
        } )
    }
}

class YarServer {
    static async handle( requestBuffer , handleClass: object ) {
        // 1. unpack the request
        let rpcInfo;
        let rpcCallInfo;
        try {
            try {
                rpcInfo = YarPacket.parse( requestBuffer );
                rpcCallInfo = unserialize( rpcInfo.body );
            } catch ( e ) {
                Log.warning('invalid rpc request', { message: e.message } );
                throw new Error('invalid rpc request');
            }
            if ( rpcCallInfo.i !== rpcInfo.header.id ) {
                throw new Error('invalid transaction id');
            }
            if ( !rpcCallInfo.m || !rpcCallInfo.p ) {
                throw new Error('invalid call method or paramaters');
            }

            if ( typeof handleClass[ rpcCallInfo.m ] !== 'function' ) {
                throw new Error('invalid handler or handler\'s method');
            }
            if ( !Array.isArray( rpcCallInfo.p ) ) {
                throw new Error('invalid call params');
            }
        } catch ( e ) {
            // invalid request
            let returnPack = YarPacket.buildResponsePack( 0, 1, null, e.message, 'invalid rpc request');
            return YarPacket.buildBits( returnPack );
        }

        // 2. execute the method
        try {
            let returnData = await handleClass[ rpcCallInfo.m ]( ...rpcCallInfo.p );
            let returnPack = YarPacket.buildResponsePack( rpcCallInfo.i, 0, returnData );
            return YarPacket.buildBits( returnPack );
        } catch ( e ) {
            // call failed
            let returnPack = YarPacket.buildResponsePack( 0, 2, null, e.message, 'call handler method failed');
            return YarPacket.buildBits( returnPack );
        }
    }
}

export { YarClient, YarServer };