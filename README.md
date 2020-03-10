# @yadou/yarpc

A rpc client for yar(a php rpc extenstion) 

## Install
```bash
npm install -D @yadou/yarpc
```

## The Yar Protocal
Yar is an rpc extension for PHP, Whick is mainly based on HTTP protocol to communication. The body is a binary package of a custom protocol, The structure of this custom protocol is as follows:
It is divided into ```header```, ```packagerName```, ```body``` three parts.
```javascript
/*

let yarPacket = {
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
}
*/
```

## Test code
1、
open a bash window and start the server test
```bash
node ./test/server.test.js
```

2、
open another bash window and execute the client test

```
node ./test/client.test.js
```


## Tips
If this help you in work, please give me a star