import serialize = require('locutus/php/var/serialize');

interface YarPacketStruct {
    header: {
        id: number,
        version: number,
        magic_num: number,
        reserved: number,
        provider: string,
        token: string,
        body_len: number
    },
    packager_name: string,
    body: string
};

class YarPacket {
    /*
        Yar Protocal
        分为 header packagerName body 部分
        header: {
            id: int 4Bytes
            version: short 2Bytes
            magic_num: int 4Bytes
            reserved: int 4Bytes
            provider: char 32Bytes
            token: char 32Bytes
            len: int 4Bytes
        }
        packager_name: char 8Bytes
        body 内容 {i: "transaction id", m: "the method which being called", p: "Array - parameters" }
    */
   static map = {
        header: {
            id: [ 'uint', 4 ],
            version: [ 'ushort', 2 ],
            magic_num: [ 'uint', 4 ],
            reserved: [ 'uint', 4 ],
            provider: [ 'uchar', 32 ],
            token: [ 'uchar', 32 ],
            body_len: [ 'uint', 4 ]
        },
        packager_name: [ 'string', 8 ],
    };
    static headerBit = 82;
    static nameBit = 8;

    static parse( bits ): YarPacketStruct {
        let dataView = _buildDataView( bits );
        let yarPacket = {};
        let offset = 0;
        Object.keys( YarPacket.map ).map( ( key ) => {
            let val = YarPacket.map[ key ];
            if ( Array.isArray( val ) ) {
                yarPacket[key] = _parseBit( dataView, val, offset );
                offset += val[ 1 ];
            } else {
                // object
                yarPacket[ key ] = {};
                Object.keys( val ).map( ( skey ) => {
                    let sval = val[ skey ];
                    yarPacket[ key ][ skey ] = _parseBit( dataView, sval, offset );
                    offset += sval[1];
                } )
            }
        } )
     
        //负载
        yarPacket[ 'body' ] =  _parseBit( dataView, [ 'string', yarPacket['header'].body_len - 8 ], offset );
        return <YarPacketStruct>yarPacket;
    }

    static buildBits( packet: YarPacketStruct ) {
        let bitNum = YarPacket.headerBit + packet.header.body_len;
        let buffer = new ArrayBuffer( bitNum );
        let dataView = new DataView( buffer );
        //header
        let offset = 0;
        Object.keys( YarPacket.map.header ).map( ( key ) => {
            let info = YarPacket.map.header[ key ];
            _buildBit( packet.header[ key ], info, dataView, offset );
            offset += info[ 1 ];
        } )
        // package_name
        _buildBit( packet.packager_name, YarPacket.map.packager_name, dataView, offset );
        offset += <number>YarPacket.map.packager_name[ 1 ];

        // content
        _buildBit( packet.body, [ 'string', packet.body.length - 8 ], dataView, offset );
        return dataView;
    }

    static buildResponsePack( transId, status, returnValue, outPut = '' , errorMessage = '' ) : YarPacketStruct{
        let body = {
            i: transId,
            s: status,
            r: returnValue,
            o: outPut,
            e: errorMessage
        };
        let bodyStr = serialize( body );
        let bodyLen = bodyStr.length;
        let packagerName = 'PHP\u0000YAR_';
        bodyLen += packagerName.length;
        let provider = 'PHP Yar Server';
        provider += '\u0000'.repeat( 32 - provider.length );
        let packet = {
            header: {
                id: transId,
                version: 0,
                magic_num: 2162158688,
                reserved: 0,
                provider: provider,
                token: '\u0000'.repeat( 32 ),
                body_len: bodyLen
            },
            packager_name: packagerName,
            body: bodyStr
        };
        return packet;
    }

    static buildRequestPack (methodName, params ) : YarPacketStruct {
        // transaction id
        let transId = parseInt( `${Math.random()}`.substr(2, 10) ) >>> 0;
        let body = { i: transId, m: methodName, p: params };
        let bodyStr = serialize(body);
        let body_len = bodyStr.length;

        let packet = {
            header:{
                id: transId,
                version: 0,
                magic_num: 2162158688,
                reserved: 0,
                provider: _repeat( '\u0000', 32 ),
                token: _repeat( '\u0000', 32 ),
                body_len: body_len + YarPacket.nameBit,
            },
            packager_name: 'PHP\u0000YAR_',
            body: bodyStr
        };
        return packet;
    }
}

function _repeat( str, num ) {
    while( num > 1 ) {
        let temp = str + str;
        if ( num % 2 === 1 ) {
            temp += str;
        }
        str = temp;
        num = num >> 1;
    }
    return str;
}

function _buildDataView( bitArray ) {
    let len = bitArray.length;
    let buffer = new ArrayBuffer( len );
    let dataView = new DataView( buffer );
    for ( let i = 0; i < len; i++ ) {
        dataView.setInt8( i, bitArray[ i ] );
    }
    return dataView;
}

function _buildBit( value, info, dataView: DataView, offset ) {
    switch( info[ 0 ] ) {
        case 'int':
            dataView.setInt32( offset, value );
            break;
        case 'uint':
            dataView.setUint32( offset, value );
            break;
        case 'short':
            dataView.setInt16( offset, value );
            break;
        case 'ushort':
            dataView.setUint16( offset, value );
            break;
        case 'char':
            for( let i = 0; i < value.length; i++ ) {
                dataView.setInt8( offset + i, value[ i ].charCodeAt(0) );
            }
            break;
        case 'uchar':
            for( let i = 0; i < value.length; i++ ) {
                dataView.setUint8( offset + i, value[ i ].charCodeAt( 0 ) );
            }
            break;
        case 'string':
            let buffer = string2buffer( value );
            for ( let bit of Object.values(buffer) ) {
                dataView.setInt8( offset++, bit );
            }
            break;
        default :
            throw new Error( 'unsupport type');
    }
    return true;
}

function _parseBit( dataView: DataView, info, offset ) {
    let typedArray;
    switch( info[ 0 ] ) {
        case 'int':
            return dataView.getInt32( offset );
        case 'uint':
            return dataView.getUint32( offset );
        case 'short':
            return dataView.getInt16( offset );
        case 'ushort':
            return dataView.getUint16( offset );
        case 'char':
        case 'string':
            typedArray = new Int8Array( dataView.buffer, offset, info[ 1 ] );
            return _decodeBit( typedArray );
        case 'uchar':
            typedArray = new Uint8Array( dataView.buffer, offset, info[ 1 ] );
            return _decodeBit( typedArray );
        default:
            throw new Error( 'unsupport type');
    }

}

function _decodeBit( typedBuffer, charset = 'utf8' ) {
    let decoder = new TextDecoder( charset );
    return decoder.decode( typedBuffer );
}

function string2buffer( string ) {
    let encoder = new TextEncoder();
    return encoder.encode( string );
}

export { YarPacket };