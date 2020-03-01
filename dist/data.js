"use strict";
exports.__esModule = true;
var index_1 = require("./index");
var crypto = require("crypto");
var LocalClient = /** @class */ (function () {
    function LocalClient() {
    }
    LocalClient.call = function (strApp, strMethod, arrParams) {
        if (arrParams === void 0) { arrParams = []; }
        var result = {
            errno: 0,
            data: null
        };
        var arrCallParams = LocalClient._getCallParams(strApp, strMethod, arrParams);
        var yarClient = new index_1.YarClient({ apiUrl: arrCallParams.url });
        return yarClient.call('common', [arrCallParams['method'], arrCallParams['token'], arrCallParams['params']]);
    };
    LocalClient._getCallParams = function (strApp, strMethod, arrParams) {
        var url = 'http://172.17.20.24/rpc/common?' + strMethod;
        var strParams = JSON.stringify(arrParams);
        var strDescToken = 'ad8a7fda5270718621a69b86676f5856';
        var strDescKey = 'sdkfskfk';
        strParams = LocalClient.encode(strParams, strDescKey);
        return {
            url: url,
            method: strMethod,
            token: strDescToken,
            params: strParams
        };
    };
    LocalClient.encode = function (text, key) {
        key = new Buffer(key);
        console.log(key);
        var iv = new Buffer(0);
        var cipher = crypto.createCipheriv('des-ecb', key, iv);
        cipher.setAutoPadding(true); //default true
        var ciph = cipher.update(text, 'utf8', 'base64');
        ciph += cipher.final('base64');
        return ciph;
    };
    return LocalClient;
}());
var promise = LocalClient.call('crm', 'getUserInfos', [[50427]]);
promise.then(console.log, console.error);
