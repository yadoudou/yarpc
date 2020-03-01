var unserialize = require('locutus/php/var/unserialize');
var http = require('http');
var YarPacket_1 = require('./YarPacket');
var YarClient = (function () {
    function YarClient(conf) {
        this.conf = {
            apiUrl: null,
            connectTimeOutMs: 10000,
            timeOutMs: 10000
        };
        this.urlObject = null;
        this.conf = { this: .conf, conf: conf };
        try {
            this.urlObject = new URL(this.conf.apiUrl);
        }
        catch (e) {
        }
        if (!this.urlObject || !this.urlObject.host) {
            throw new Error('invalid rpc api url');
        }
    }
    YarClient.prototype.call = function (strMethod, arrParmas) {
        var _this = this;
        if (arrParmas === void 0) { arrParmas = []; }
        return new Promise(function (resolve, reject) {
            var packet = YarPacket_1.YarPacket.buildRequestPack(strMethod, arrParmas);
            var packetBits = YarPacket_1.YarPacket.buildBits(packet);
            var options = {
                hostname: _this.urlObject.host,
                port: _this.urlObject.port || 80,
                path: _this.urlObject.pathname,
                method: 'POST',
                timeout: _this.conf.timeOutMs,
                headers: {
                    'Host': _this.urlObject.host,
                    'Accept': '*/*',
                    'User-Agent': "Node Yarpc Rpc-2.0.5",
                    'Connection': 'close',
                    'Content-Length': packetBits.byteLength,
                    'Content-Type': "application/x-www-form-urlencode"
                }
            };
            // create request
            var startTime = Date.now();
            var req = http.request(options, function (res) {
                var intUseTime = Date.now() - startTime;
                console.log('request respone', { statusCode: res.statusCode, useTime: intUseTime });
                res.on('data', function (chunk) {
                    var packet = YarPacket_1.YarPacket.parse(chunk);
                    var returnInfo = unserialize(packet.body);
                    if (returnInfo.s !== 0) {
                        console.log('rpc return failed', { status: returnInfo.s, message: returnInfo.e, output: returnInfo.o });
                        reject('call rpc failed');
                        return true;
                    }
                    if (returnInfo.o.length > 0) {
                        console.log('rpc return has output', { output: returnInfo.o });
                    }
                    resolve(returnInfo.r);
                });
            });
            // on error
            req.on('error', function (e) {
                console.log('request failed', { errMessage: e.message });
                reject(e);
            });
            //send buffer
            var buffer = Buffer.from(packetBits.buffer);
            req.write(buffer);
            req.end(function () {
                console.log('send rpc request', { url: _this.urlObject.href });
            });
        });
    };
    return YarClient;
})();
exports.YarClient = YarClient;
