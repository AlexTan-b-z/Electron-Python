// renderer.js
var thrift = require('thrift');
// 调用win10下thrift命令自动生成的依赖包
var userService = require('./gen-nodejs/userService.js');
var ttypes = require('./gen-nodejs/test_types.js');
var thriftConnection = thrift.createConnection('127.0.0.1', 8000);
var thriftClient = thrift.createClient(userService,thriftConnection);

thriftConnection.on("error",function(e)
{
    console.log(e);
});


/* var client = new zerorpc.Client();
client.connect("tcp://127.0.0.1:4242"); */

let name = document.querySelector('#name')
let result = document.querySelector('#result')
name.addEventListener('input', () => {
  var dic = {name: name.value}
  dic = JSON.stringify(dic)
  thriftClient.test1(dic, (error, res) => {
    if(error) {
      console.error(error)
    } else {
      result.textContent = res
    }
  })
})
name.dispatchEvent(new Event('input'))