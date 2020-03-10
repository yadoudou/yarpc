const yarpc = require('../dist/index');

let yarClient = new yarpc.YarClient({apiUrl:'http://localhost:8000'});

let result = yarClient.call( 'common', [ 'arg1', 'arg2', Date.now() ] );
result.then( console.log, console.err );