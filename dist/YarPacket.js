"use strict";
exports.__esModule = true;
var serialize = require("locutus/php/var/serialize");
;
var YarPacket = /** @class */ (function () {
    function YarPacket() {
    }
    YarPacket.parse = function (bits) {
        var dataView = _buildDataView(bits);
        var yarPacket = {};
        var offset = 0;
        Object.keys(YarPacket.map).map(function (key) {
            var val = YarPacket.map[key];
            if (Array.isArray(val)) {
                yarPacket[key] = _parseBit(dataView, val, offset);
                offset += val[1];
            }
            else {
                // object
                yarPacket[key] = {};
                Object.keys(val).map(function (skey) {
                    var sval = val[skey];
                    yarPacket[key][skey] = _parseBit(dataView, sval, offset);
                    offset += sval[1];
                });
            }
        });
        //负载
        yarPacket['body'] = _parseBit(dataView, ['string', yarPacket['header'].body_len - 8], offset);
        return yarPacket;
    };
    YarPacket.buildBits = function (packet) {
        var bitNum = YarPacket.headerBit + packet.header.body_len;
        var buffer = new ArrayBuffer(bitNum);
        var dataView = new DataView(buffer);
        //header
        var offset = 0;
        Object.keys(YarPacket.map.header).map(function (key) {
            var info = YarPacket.map.header[key];
            _buildBit(packet.header[key], info, dataView, offset);
            offset += info[1];
        });
        // package_name
        _buildBit(packet.packager_name, YarPacket.map.packager_name, dataView, offset);
        offset += YarPacket.map.packager_name[1];
        // content
        _buildBit(packet.body, ['string', packet.body.length - 8], dataView, offset);
        return dataView;
    };
    YarPacket.buildRequestPack = function (methodName, params) {
        // transaction id
        var transId = parseInt(("" + Math.random()).substr(2, 10)) >>> 0;
        var body = { i: transId, m: methodName, p: params };
        var bodyStr = serialize(body);
        var body_len = bodyStr.length;
        var packet = {
            header: {
                id: transId,
                version: 0,
                magic_num: 2162158688,
                reserved: 0,
                provider: _repeat('\u0000', 32),
                token: _repeat('\u0000', 32),
                body_len: body_len + YarPacket.nameBit
            },
            packager_name: 'PHP\u0000YAR_',
            body: bodyStr
        };
        return packet;
    };
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
    YarPacket.map = {
        header: {
            id: ['uint', 4],
            version: ['ushort', 2],
            magic_num: ['uint', 4],
            reserved: ['uint', 4],
            provider: ['uchar', 32],
            token: ['uchar', 32],
            body_len: ['uint', 4]
        },
        packager_name: ['string', 8]
    };
    YarPacket.headerBit = 82;
    YarPacket.nameBit = 8;
    return YarPacket;
}());
exports.YarPacket = YarPacket;
function _repeat(str, num) {
    while (num > 1) {
        var temp = str + str;
        if (num % 2 === 1) {
            temp += str;
        }
        str = temp;
        num = num >> 1;
    }
    return str;
}
function _buildDataView(bitArray) {
    var len = bitArray.length;
    var buffer = new ArrayBuffer(len);
    var dataView = new DataView(buffer);
    for (var i = 0; i < len; i++) {
        dataView.setInt8(i, bitArray[i]);
    }
    return dataView;
}
function _buildBit(value, info, dataView, offset) {
    switch (info[0]) {
        case 'int':
            dataView.setInt32(offset, value);
            break;
        case 'uint':
            dataView.setUint32(offset, value);
            break;
        case 'short':
            dataView.setInt16(offset, value);
            break;
        case 'ushort':
            dataView.setUint16(offset, value);
            break;
        case 'char':
            for (var i = 0; i < value.length; i++) {
                dataView.setInt8(offset + i, value[i].charCodeAt(0));
            }
            break;
        case 'uchar':
            for (var i = 0; i < value.length; i++) {
                dataView.setUint8(offset + i, value[i].charCodeAt(0));
            }
            break;
        case 'string':
            var buffer = string2buffer(value);
            for (var _i = 0, _a = Object.values(buffer); _i < _a.length; _i++) {
                var bit = _a[_i];
                dataView.setInt8(offset++, bit);
            }
            break;
        default:
            throw new Error('unsupport type');
    }
    return true;
}
function _parseBit(dataView, info, offset) {
    var typedArray;
    switch (info[0]) {
        case 'int':
            return dataView.getInt32(offset);
        case 'uint':
            return dataView.getUint32(offset);
        case 'short':
            return dataView.getInt16(offset);
        case 'ushort':
            return dataView.getUint16(offset);
        case 'char':
        case 'string':
            typedArray = new Int8Array(dataView.buffer, offset, info[1]);
            return _decodeBit(typedArray);
        case 'uchar':
            typedArray = new Uint8Array(dataView.buffer, offset, info[1]);
            return _decodeBit(typedArray);
        default:
            throw new Error('unsupport type');
    }
}
function _decodeBit(typedBuffer, charset) {
    if (charset === void 0) { charset = 'utf8'; }
    var decoder = new TextDecoder(charset);
    return decoder.decode(typedBuffer);
}
function string2buffer(string) {
    var encoder = new TextEncoder();
    return encoder.encode(string);
}
