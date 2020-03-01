"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var unserialize = require("locutus/php/var/unserialize");
var http = require("http");
var yalog_1 = require("@yadou/yalog");
var YarPacket_1 = require("./YarPacket");
var YarClient = /** @class */ (function () {
    function YarClient(conf) {
        this.conf = {
            apiUrl: null,
            connectTimeOutMs: 10000,
            timeOutMs: 10000
        };
        this.urlObject = null;
        this.conf = __assign(__assign({}, this.conf), conf);
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
                yalog_1["default"].info('request respone', { statusCode: res.statusCode, useTime: intUseTime });
                res.on('data', function (chunk) {
                    var packet = YarPacket_1.YarPacket.parse(chunk);
                    var returnInfo = unserialize(packet.body);
                    if (returnInfo.s !== 0) {
                        yalog_1["default"].warning('rpc return failed', { status: returnInfo.s, message: returnInfo.e, output: returnInfo.o });
                        reject('call rpc failed');
                        return true;
                    }
                    if (returnInfo.o.length > 0) {
                        yalog_1["default"].warning('rpc return has output', { output: returnInfo.o });
                    }
                    resolve(returnInfo.r);
                });
            });
            // on error
            req.on('error', function (e) {
                yalog_1["default"].warning('request failed', { errMessage: e.message });
                reject(e);
            });
            //send buffer
            var buffer = Buffer.from(packetBits.buffer);
            req.write(buffer);
            req.end(function () {
                yalog_1["default"].trace('send rpc request', { url: _this.urlObject.href });
            });
        });
    };
    return YarClient;
}());
exports.YarClient = YarClient;
