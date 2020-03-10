#发布一个基于node.js + yar协议的rpc npm包

有兴趣的同学先把代码拉下来看看

## yarpc的安装
```bash
git clone https://github.com/yadoudou/yarpc.git
```

也可以通过npm安装到当前项目
```bash
npm install @yadou/yarpc
```

## yarpc的原理解析
熟悉PHP的同学可能知道，PHP有个rpc的扩展yar，是知名PHP官方核心成员鸟哥开发，一个简单地rpc扩展，由于业务上想通过nodejs来掉一些原来的接口，而原来接口很多事通过rpc提供的，也是基于yar的一个封装。所以查了一下yar的一个协议，实现了一个简单版本的nodejs版的yar协议rpc框架。

rpc的原理这里就不过多解释，下面简单列下yar的一个二进制包的协议吧。
下面的代码就是yar的pack组成部分，含header部分，packager_name, body部分，其中header部分字段和对应的长度都是固定的，header中的len就是body的长度和packager_name的长度之和。
他是一个二进制包，通过HTTP的POST请求，将二进制包放到body体，发送到服务端，服务端解析这个二进制包，得到客户端要调用的方法和传参。

## yar的pack协议
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

其实解析出了二进制包，就已经拿到了客户端的数据了，body体包含一些信息，他是一个序列化的对象，本次实现只有基于php的serialize序列化。

## 示例代码
test文件夹下面是一个简单地demo
./test/server.test.js作为一个服务端，监听rpc请求，然后解析包，调用对应的方法
```javascript
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
```

./test/client.test.js 客户端请求的demo，发起一个rpc请求，然后console一下结果
```javascript
const yarpc = require('../dist/index');

let yarClient = new yarpc.YarClient({apiUrl:'http://localhost:8000'});

let result = yarClient.call( 'common', [ 'arg1', 'arg2', Date.now() ] );
result.then( console.log, console.err );
```

PHP的yar版还支持并发调用，这个在nodejs里面用不着，因为node.js最大的优势就是异步IO，业务上可以直接同时发起多个rpc请求

首发我的blog： [https://www.geek-share.com/detail/2794853620.html](https://www.geek-share.com/detail/2794853620.html )