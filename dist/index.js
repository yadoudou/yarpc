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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var unserialize = require("locutus/php/var/unserialize");
var http = require("http");
var yalog_1 = require("@yadou/yalog");
var YarPacket_1 = require("./YarPacket");
var buffer_1 = require("buffer");
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
                hostname: _this.urlObject.hostname,
                port: _this.urlObject.port || 80,
                path: _this.urlObject.pathname,
                method: 'POST',
                timeout: _this.conf.timeOutMs,
                headers: {
                    'Host': _this.urlObject.hostname,
                    'Accept': '*/*',
                    'User-Agent': "Node Yarpc Rpc-2.0.5",
                    'Connection': 'close',
                    'Content-Length': packetBits.byteLength,
                    'Content-Type': "application/octet-stream"
                }
            };
            // create request
            var startTime = Date.now();
            var req = http.request(options, function (res) {
                var intUseTime = Date.now() - startTime;
                yalog_1["default"].trace('request respone', { statusCode: res.statusCode, useTime: intUseTime });
                var buffers = [];
                res.on('data', function (chunk) {
                    buffers.push(chunk);
                });
                res.on('end', function () {
                    var buffer = buffer_1.Buffer.concat(buffers);
                    var packet = YarPacket_1.YarPacket.parse(buffer);
                    var returnInfo = unserialize(packet.body);
                    if (!returnInfo) {
                        reject('call rpc failed');
                        return false;
                    }
                    if (returnInfo.s !== 0) {
                        yalog_1["default"].warning('rpc return failed', { status: returnInfo.s, message: returnInfo.e, output: returnInfo.o });
                        reject('call rpc failed');
                        return false;
                    }
                    if (returnInfo.o && returnInfo.o.length > 0) {
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
            var buffer = buffer_1.Buffer.from(packetBits.buffer);
            req.write(buffer);
            req.end(function () {
                yalog_1["default"].trace('send rpc request', { url: _this.urlObject.href });
            });
        });
    };
    return YarClient;
}());
exports.YarClient = YarClient;
var YarServer = /** @class */ (function () {
    function YarServer() {
    }
    YarServer.handle = function (requestBuffer, handleClass) {
        return __awaiter(this, void 0, void 0, function () {
            var rpcInfo, rpcCallInfo, returnPack, returnData, returnPack, e_1, returnPack;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        try {
                            try {
                                rpcInfo = YarPacket_1.YarPacket.parse(requestBuffer);
                                rpcCallInfo = unserialize(rpcInfo.body);
                            }
                            catch (e) {
                                yalog_1["default"].warning('invalid rpc request', { message: e.message });
                                throw new Error('invalid rpc request');
                            }
                            if (rpcCallInfo.i !== rpcInfo.header.id) {
                                throw new Error('invalid transaction id');
                            }
                            if (!rpcCallInfo.m || !rpcCallInfo.p) {
                                throw new Error('invalid call method or paramaters');
                            }
                            if (typeof handleClass[rpcCallInfo.m] !== 'function') {
                                throw new Error('invalid handler or handler\'s method');
                            }
                            if (!Array.isArray(rpcCallInfo.p)) {
                                throw new Error('invalid call params');
                            }
                        }
                        catch (e) {
                            returnPack = YarPacket_1.YarPacket.buildResponsePack(0, 1, null, e.message, 'invalid rpc request');
                            return [2 /*return*/, YarPacket_1.YarPacket.buildBits(returnPack)];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handleClass[rpcCallInfo.m].apply(handleClass, rpcCallInfo.p)];
                    case 2:
                        returnData = _a.sent();
                        returnPack = YarPacket_1.YarPacket.buildResponsePack(rpcCallInfo.i, 0, returnData);
                        return [2 /*return*/, YarPacket_1.YarPacket.buildBits(returnPack)];
                    case 3:
                        e_1 = _a.sent();
                        returnPack = YarPacket_1.YarPacket.buildResponsePack(0, 2, null, e_1.message, 'call handler method failed');
                        return [2 /*return*/, YarPacket_1.YarPacket.buildBits(returnPack)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return YarServer;
}());
exports.YarServer = YarServer;
