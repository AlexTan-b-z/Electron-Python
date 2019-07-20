# WIN10 Electron+Python界面开发（通信方式：thrift）

​		Python做界面开发要么繁琐要么太丑，同时Python客户端开发人员又是非常稀少的。而WEB前端工程师一抓一大把，同时WEB前端所开发出来的界面及交互效果都是非常美观的，同时有的软件可能客户端也需要，WEB端也需要，甚至移动端也需要，在要求美观的同时，有没有一个解决方案就能适应所有平台的呢？

​		没错，目前最好的解决方案就是做WEB开发，首先其本身能在WEB上使用，对于移动端来讲，打包WEBAPP的工具一搜一大堆，而想同时能满足客户端的需求？ 那就可以使用Electron了。

​		[Electron](https://electronjs.org/docs)也已经比较成熟了，目前很多界面每隔的桌面程序都是Electron开发的，比如说：Github、Skype、Atom、VSCode等。

​		而此篇博文主要分享Electron+Python的方式做界面开发。网上也有比较多的教程，但大部分教程里Electron和Python的通信方式要么是Http，要么是zerorpc，Http太笨重，且不太适合客户端程序；npm的zerorpc安装过程太繁琐，太多版本问题，反正我用npm安装zerorpc搞了好几天都没弄好，因此最终换其他通信方案（期间也试过谷歌的gRPC），比较后最终选择Thrift，除了性能优势外，安装及配置都比较简单。

​		流程如下：

```text
start
 |
 V
+--------------------+
|                    | start
|  electron          +-------------> +------------------+
|                    | sub process   |                  |
| (browser)          |               | python server    |
|                    |               |                  |
| (all html/css/js)  |               | (business logic) |
|                    |   thrift     |                  |
| (node.js runtime,  | <-----------> | (thrift server)  |
|  thrift client)    | communication |                  |
|                    |               |                  |
+--------------------+               +------------------+
```

​	

### 安装配置

- 系统：win10

- 开发环境：

  - Python: 3.7
  - node: v10.15.3
  - npm: 6.9.0

- python环境：

  - `pip install thrift`

- 步骤：

  1. 首先创建你的应用文件夹: app

  2. 进入文件夹 `npm init` 初始化

  3. 修改`package.json`文件，参考：

     ```json
     {
       "name": "ele_test",
       "version": "1.0.0",
       "description": "",
       "main": "main.js",
       "dependencies": {
         "thrift": "^0.12.0"
       },
       "devDependencies": {},
       "scripts": {
         "start": "electron ."
       },
       "author": "",
       "license": "ISC"
     }
     ```

  4. 安装npm第三方包：

     - `npm install electron -g`(如果安装太慢或者安装不了的话试试先安装`cnpm`，再使用`cnpm install electron -g`)
     - npm install thrift

  5. 去github下载[thrift.exe](https://github.com/apache/thrift/releases)（其他平台下载相应内容即可）

  6. 新建接口文件`test.thrift`:

     ```javascript
     service userService {
         string test1(1:string name)
     }
     ```

  7. 生成各自的接口文件：

     `thrift -out 存储路径 --gen 接口语言 thrift接口文件名`

### 开发

##### 编写客户端（前端）相关文件：

在app目录下新建文件`main.js`:

```javascript
const {app, BrowserWindow} = require('electron')

  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let win

  function createWindow () {
    // 创建浏览器窗口。
    win = new BrowserWindow({width: 800, height: 600, webPreferences:{nodeIntegration:true}})

    // 然后加载应用的 index.html。
    win.loadFile('index.html')

    // 打开开发者工具
    win.webContents.openDevTools()

    // 当 window 被关闭，这个事件会被触发。
    win.on('closed', () => {
      // 取消引用 window 对象，如果你的应用支持多窗口的话，
      // 通常会把多个 window 对象存放在一个数组里面，
      // 与此同时，你应该删除相应的元素。
      win = null
    })
  }

  // Electron 会在初始化后并准备
  // 创建浏览器窗口时，调用这个函数。
  // 部分 API 在 ready 事件触发后才能使用。
  app.on('ready', createWindow)

  // 当全部窗口关闭时退出。
  app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (win === null) {
      createWindow()
    }
  })

  // 在这个文件中，你可以续写应用剩下主进程代码。
  // 也可以拆分成几个文件，然后用 require 导入。

  const path=require('path')

let pyProc = null
let pyPort = null


const createPyProc = () => {
  // let port = '4242'
  let script = path.join(__dirname, 'py', 'thrift_server.py')
  pyProc = require('child_process').spawn('python', [script])
  if (pyProc != null) {
    console.log('child process success')
  }
}


const exitPyProc = () => {
  pyProc.kill()
  pyProc = null
  pyPort = null
}

app.on('ready', createPyProc)
app.on('will-quit', exitPyProc)
```

新建文件`render.js`:

```javascript
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
```

新建`index.html`:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Hello XX</title>
  </head>
  <body>
    <input id="name" ></input>
    <p id="result" color='black'></p>
  </body>
  <script>
    require('./render.js')
    // import './render.js'
  </script>
</html>
```

#####  编写服务端相关文件

在app目录下新建目录py，

进入py目录，新建文件`thrift_server.py`:

```python
import json
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer

from gen_py.test import userService


class Test:
    def test1(self, dic):
        print("one")
        dic = json.loads(dic)
        return f'Hello, {dic["name"]}!'


if __name__ == "__main__":
    port = 8000
    ip = "127.0.0.1"
    # 创建服务端
    handler = Test()  # 自定义类
    processor = userService.Processor(handler)  # userService为python接口文件自动生成
    # 监听端口
    transport = TSocket.TServerSocket(ip, port)  # ip与port位置不可交换
    # 选择传输层
    tfactory = TTransport.TBufferedTransportFactory()
    # 选择传输协议
    pfactory = TBinaryProtocol.TBinaryProtocolFactory()
    # 创建服务端
    server = TServer.TThreadedServer(processor, transport, tfactory, pfactory)
    print("start server in python")
    server.serve()
    print("Done")
```

### 启动

运行`npm start`即可运行

### 打包

测试没问题之后我们需要将应用打包，因为别人电脑上不一定装了node.js或是python。首先要装个打包工具`pip install pyinstaller`。

在`package.json`的`script`中加入`"build-python":"pyinstaller ./py/thrift_server.py --clean"`。然后运行`npm run build-python编译一下`。编译完了可以把根目录下生成的`build`文件夹和`thrift_server.spec`删了。如果中间报错 `AttributeError: module 'enum' has no attribute 'IntFlag'`，就运行`pip uninstall enum34`把enum34删了。



> This is likely caused by the package `enum34`. Since python 3.4 there's a standard library `enum`module, so you should uninstall `enum34`, which is no longer compatible with the enum in the standard library since `enum.IntFlag` was added in python 3.6



之前子进程是通过调用python命令运行的，现在我们要换成生成的可执行程序。修改`main.js`：



```js
// let script = path.join(__dirname, 'py', 'thrift_server.py')
  // pyProc = require('child_process').spawn('python', [script])
  let script = path.join(__dirname, 'py', 'dist','thrift_server')
  pyProc = require('child_process').execFile(script)
```





运行`npm start`可以查看效果。

在根目录运行`npm install electron-packager --save-dev`安装Electron打包模块。然后将`"pack-app": "./node_modules/.bin/electron-packager . --overwrite --ignore=py$"`写入`package.json`的script中。

运行`npm run pack-app`打包程序。最后会生成可执行文件，复制到别的电脑也可以运行。



代码已上传至[Github](https://github.com/AlexTan-b-z/Electron-Python)