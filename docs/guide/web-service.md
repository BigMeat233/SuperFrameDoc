# Web服务

## 启动Web服务

我们使用Corejs内置的**ServiceCore**创建和管理Web服务，启动Web服务分为两个步骤：

**首先，使用```Core.ServiceCore```创建ServiceCore的实例：**

```javascript
const Core = require('node-corejs');
const serviceCore = new Core.ServiceCore();
```

创建时可以指定Web服务的配置对象```configs```：

- **```configs.id```**：**ServiceCore**的ID，用于标识**ServiceCore**。非必填项，默认值：```ServiceCore_${generateRandomString(6, 'uln')}```;
- **```configs.port```**：Web服务驻留的端口。非必填项，默认值：```3000```。
- **```configs.serverOpt```**：Web服务的构建配置。非必填项，默认值：```{}```。
- **```configs.baseRoutePath```**：Web服务的基础请求路径，用于指定统一的请求路径前缀。非必填项，默认值：```'/'```。

  > **比如，当此配置为```'/api'```，ServiceCore挂载了请求路径为```'/Test.do'```的Handler时，客户端需要请求```'/api/Test.do'```。**

  ::: warning 注意

  - 当此配置不以```'/'```开头时，将自动附加```'/'```作为前缀。比如：当业务层配置此项为```'api'```，将自动被调整为```'/api'```。
  - 当此配置以```'/'```结尾时，将自动删除位于结尾的所有```'/'```。比如：当业务层配置此项为```'/api//'```，将自动被调整为```'/api'```。

  :::

- **```configs.middlewares```**：全局中间件列表。非必填项，默认值：```[]```。

---

**然后，使用实例方法```start()```启动Web服务**。此方法接收两个非必填参数：**启动配置**和**回调函数**。

```javascript
serviceCore.start([[options], callBack]);
```

::: tip 提示
对于构建配置```serverOpt```和启动配置```options```，我们将在[构建过程](#构建过程)一节中进行详细讨论。
:::

通常，我们在执行```start()```时使用**回调函数**处理Web服务的启动结果：

```javascript
serviceCore.start((err) => {
  // 如果err为null则表示Web服务启动成功
  if (err) {
    // Web服务启动失败
    console.log(`服务启动失败: ${err}`);
    return;
  }
  // Web服务启动成功
  console.log('服务启动成功');
});
```

需要注意的是，```start()```执行成功后将会使ServiceCore**变更为启动状态，仅允许在关闭状态执行的操作将被拒绝执行：

- [设置全局拦截器](#全局拦截器)
- [设置错误拦截器](#错误拦截器)
- [自定义构建过程](#构建过程)

## 构建过程

**ServiceCore**的实例方法```start()```执行时将触发Web服务的构建过程，我们可以通过修改实例属性```createServer```对构建过程进行定制。

::: danger 注意
**ServiceCore**实例仅允许在处于关闭状态时变更其```createServer```属性，且新的构造过程中需要包含**构建Server**和**启动Server**两个阶段。
:::

```createServer```允许被设置为```Function```或```AsyncFunction```类型的值，其参数列表依次为：

- **```options```**：执行```start()```时指定的**启动配置**。
- **```app```**：**ServiceCore**自动构建的Express实例。
- **```configs```**：**ServiceCore**实例化时指定的构造参数。

  > **ServiceCore在实例化过程中将自动对构造参数中指定配置进行校正。因此，此值可能与创建ServiceCore时实际指定的构造参数有差异。**

- **```callBack```**：回调函数，参数列表为```(error, detail)```。

  > **ServiceCore将根据此函数回调的信息自动判断构建过程的执行结果，当回抛的```error```为```null```时表示构建过程执行成功，此时ServiceCore将被置为启动状态。**

  ::: tip 说明
  Web服务构建过程中执行```callBack()```时传入的```error```和```detail```将作为```start()```回调函数的回调信息向业务层回抛。
  
  在默认构建过程中，```detail```的结构为```{ app, server, serverType }```：

  - **```app```**：自动构建的Express实例。
  - **```server```**：支撑Web服务的Server实例。
  - **```serverType```**：Server实例的类型，为```'http'```或```'https'```。
  :::

---

接下来，我们将结合默认构建过程的实现，来讨论创建**ServiceCore**时指定的```configs.serverOpt```和执行```start()```时指定的```options```的作用。

默认的构建过程实现如下：

```javascript
createServer(options, app, configs, callBack) {
  // 参数处理
  const { port, serverOpt } = configs;
  options = Object.assign({}, { port }, options);

  // 创建server
  let server = null;
  let serverType = 'http';
  // 当指定了有效的ssl配置时 - 启动https服务器
  if (serverOpt && serverOpt.cert && serverOpt.key) {
    server = https.createServer(serverOpt, app);
    serverType = 'https';
  }
  // 未指定ssl或配置无效时 - 启动http服务器
  else {
    server = http.createServer(serverOpt, app);
    serverType = 'http';
  }

  // 启动server
  server.on('error', (error) => callBack(error));
  server.on('listening', () => callBack(null, { app, server, serverType }));
  server.listen(options);
}
```

因此，在实例化**ServiceCore**时，如果指定了有效的```configs.serverOpt.key```和```configs.serverOpt.cert```则使用```https.createServer()```创建Server实例，否则使用```http.createServer()```。

::: tip 提示
```serverOpt```将作为创建Server实例的配置参数；执行实例方法```start()```时指定的启动配置```options```将作为启动Server实例的配置参数。

具体配置项可以参照[NodeJS官方文档](https://nodejs.org/en/docs/)中```https.createServer()```、```http.createServer()```和```server.listen()```的相关描述。
:::

## TLS/SSL

如果我们期望启动TLS/SSL模式的Web服务，只需在实例化**ServiceCore**时指定有效的```configs.serverOpt.key```和```configs.serverOpt.cert```即可。

我们在[构建过程](#构建过程)一节已经知道，默认的构建行为使用```https.createServer()```实现Web服务的TLS/SSL，因此：

**我们可以通过指定证书和密钥文件路径的方式启动TLS/SSL模式的Web服务。**

```javascript
const Core = require('node-corejs');
const SSL_KEY_PATH = './ssl.key';
const SSL_CERT_PATH = './cert.pem';

const serviceCore = new Core.ServiceCore({
  serverOpt: {
    key: SSL_KEY_PATH,
    cert: SSL_CERT_PATH
  }
});
```

通常，直接指定证书和密钥文件的路径具有很大的局限性（比如：打包导致文件路径产生偏移）。

**我们可以使用将证书和密钥装入```Buffer```的形式规避：**

```javascript
const fs = require('fs');
const Core = require('node-corejs');
const SSL_KEY_PATH = './ssl.key';
const SSL_CERT_PATH = './cert.pem';

const serviceCore = new Core.ServiceCore({
  serverOpt: { 
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  }
});
```

## 处理模型

![请求处理模型](/images/请求处理流程.jpg)

## 全局拦截器

进入**ServiceCore**的所有客户端流量将被**全局拦截器**捕获并处理。**ServiceCore**将在业务层执行实例方法```start()```时，将**全局拦截器**使用```app.use()```挂载至Express中间件列表首位。

我们可以通过修改ServiceCore的实例属性```globalIntercaptor```以对**全局拦截器**逻辑进行定制。

::: danger 注意
- 在全局拦截器逻辑结束后，务必使用```next()```分发处理流程至后续阶段。

- **ServiceCore**实例仅允许在处于关闭状态时变更其```globalIntercaptor```属性。

- **ServiceCore**将自动捕获全局拦截器中产生的异常（因此，推荐使用```async/await```指定异步动作），使之自动进入[错误拦截器](#错误拦截器)处理。
:::

```globalIntercaptor```允许被设置为```Function```或```AsyncFunction```类型的值，其参数列表依次为：

- **```req```**：客户端请求实例。
- **```res```**：客户端返回实例。
- **```next```**：Express中间件流程控制函数，使用方式可以参考[Express官方文档](http://expressjs.com/en/guide/using-middleware.html)中对于```next()```的描述。

**在全局拦截器中不包含异步逻辑时，我们通常指定为```Function```类型：**

```javascript
// 指定同步全局拦截器
serviceCore.globalIntercaptor = (req, res, next) => {
  // 执行全局拦截器逻辑
  // ...
  // 拦截器逻辑结束后执行next()分发处理流程至下游链路
  next();
};
```

**当全局拦截器中包含异步逻辑时，推荐指定为```AsyncFunction```类型以使用```await```指令进行异步操作：**

```javascript
// 指定异步全局拦截器
serviceCore.globalIntercaptor = async (req, res, next) => {
  // 执行全局拦截器逻辑
  // ...
  // 拦截器逻辑结束后执行next()分发处理流程至下游链路
  next();
};
```

---

接下来，我们将结合默认全局拦截器的实现，来讨论其对后续处理过程产生的影响。

默认全局拦截器的实现如下：

```javascript
globalInterceptor(req, res, next) {
  const requestPath = req.path;
  const routePathes = Object.keys(this._handlerMap);
  let isHandlerBinded = false;
  for (let i = 0; i < routePathes.length; i++) {
    const handlerRoutePath = routePathes[i];
    if (requestPath.indexOf(this.baseRoutePath) === 0 && requestPath.indexOf(handlerRoutePath) !== -1) {
      (isHandlerBinded = true) && next();
      break;
    }
  }

  !isHandlerBinded && res.status(404).end();
}
```

因此，如果客户端请求路径未能匹配到Handler，则认为请求无效直接返回404状态码，不再进入后续的[全局中间件](#全局中间件)和[Handler阶段](/guide/request-handler.html)。

::: warning 注意
一些实际的场景中，我们可能在[全局中间件](#全局中间件)中使用泛路径中间件（如：```express.static```），默认的全局拦截器行为可能导致请求无效。此类场景下，我们可以尝试：

- 将泛路径中间件变更至Handler维度。
- 变更全局拦截器默认行为，放行相关请求。
:::

## 全局中间件

我们把在[全局拦截器](#全局拦截器)中被放行的客户端请求称为**有效请求**，作用于有效请求的中间件便是**全局中间件**。

::: tip 提示
**全局中间件**依赖于Express中间件系统实现，因此兼容Express生态且不支持**动态中间件**行为。

对于**作用于特定请求路径的中间件**，我们可以在[自定义Handler](/guide/request-handler.html)时根据客户端请求的实际上下文（比如：请求参数）：

- 配置中间件列表
- 控制中间件执行链路（比如：跳过执行）
:::

**全局中间件**由创建**ServiceCore**时的构造参数```configs.middlewares```配置项指定：

```javascript
const serviceCore = new Core.ServiceCore({
  middlewares: []
});
```

---

**ServiceCore**在业务层执行实例方法```start()```时，当挂载**全局拦截器**完成后，将迭代构造参数```configs.middlewares```内的中间件，依次使用```app.use()```挂载至Express中间件列表。

因此，我们可以直接使用Express生态的中间件作为**全局中间件**：

```javascript
const Core = require('node-corejs');
const bodyParser = require('body-parser');
// 创建body-parser中间件
const jsonParser = bodyParser.json({ limit: 2 * 1024 * 1024 });
const urlEncodedParser = bodyParser.urlencoded({ limit: 2 * 1024 * 1024, extended: true });
// 创建ServiceCore并启动
const serviceCore = new Core.ServiceCore({
  middlewares: [jsonParser, urlEncodedParser]
});
serviceCore.start();
```

需要注意的是，**全局中间件不支持动态中间件**。在一些**全局中间件**逻辑控制的场景中，我们可以使用Middleware Wrapper实现。

样例代码将根据```body-parser```解析结果进行自定义处理，解析异常时不再向客户端抛出500状态码，而是使用200状态码向客户端返回异常信息：

```javascript
const Core = require('node-corejs');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json({ limit: 1 });
// 对原始中间件进行包装,修改默认逻辑
const jsonParserWrapper = (req, res, next) => {
  jsonParser(req, res, (err) => { res.status(200).send(err.message) });
}
// 创建ServiceCore并启动
const serviceCore = new Core.ServiceCore({
  middlewares: [jsonParserWrapper],
});
serviceCore.start();
```

## 错误拦截器

**ServiceCore**引入了**错误拦截器**用于收口请求处理过程中产生的异常。**ServiceCore**在业务层执行实例方法```start()```时，当挂载**全局拦截器**和**全局中间件**完成后，将**错误拦截器**使用```app.use()```挂载至Express中间件列表。

::: tip 提示
**错误拦截器**本质上是一个位于Express中间件列表的末位的**标准错误中间件**，将捕获到以下类型的异常：

- [全局拦截器](#全局拦截器)执行过程中产生的异常
- [全局中间件](#全局中间件)执行过程中产生的异常
- [Handler统一错误处理](/guide/request-handler.html#统一错误处理)执行过程中产生的异常
:::

默认的**错误拦截器**将直接向客户端返回500状态码（即执行```res.status(500).end()```），我们可以通过修改ServiceCore的实例属性```errorIntercaptor```以对**错误拦截器**逻辑进行定制。

::: danger 注意
**ServiceCore**实例仅允许在处于关闭状态时变更其```errorIntercaptor```属性。

另外，**ServiceCore**将自动包装**错误拦截器**为**Express标准错误中间件**。因此，我们在设置**错误拦截器**时，函数签名按需指定即可，无需严格保持```(error, req, res, next)```。
:::

```errorIntercaptor```允许被设置为```Function```或```AsyncFunction```类型的值，其参数列表依次为：

- **```error```**：未被捕获的异常。
- **```req```**：客户端请求实例。
- **```res```**：客户端返回实例。
- **```next```**：Express中间件流程控制函数，使用方式可以参考[Express官方文档](https://expressjs.com/en/guide/error-handling.html#error-handling)中对于```next()```的描述。

**在错误拦截器中不包含异步逻辑时，我们通常指定为```Function```类型：**

```javascript
// 指定同步错误拦截器
serviceCore.errorIntercaptor = (error, req, res, next) => {
  // 执行错误拦截器逻辑
  // ...
};
```

**当错误拦截器中包含异步逻辑时，推荐指定为```AsyncFunction```类型以使用```await```指令进行异步操作：**

```javascript
// 指定异步全局拦截器
serviceCore.globalIntercaptor = async (error, req, res, next) => {
  // 执行全局拦截器逻辑
  // ...
};
```

---

当然，**错误拦截器的执行过程中也可能产生异常，默认将触发Express的异常处理逻辑。**

对于此类异常，我们通常在自定义[构建过程](#构建过程)时向**Express实例**中注入兜底**Express错误处理中间件**：

```javascript
const serviceCore = new Core.serviceCore();
const nativeCreateServer = serviceCore._createServer;
serviceCore.createServer = (options, app, configs, callBack) => {
  // 注入兜底错误处理中间件(逻辑应保持简单以降低异常产生概率)
  app.use((error, req, res, next) => {
    res.status(500).send(error.message);
  });
  nativeCreateServer(options, app, configs, callBack);
}
```

## 设置请求路径

处理特定请求路径的客户端请求，需要结合[Handler](/guide/request-handler.html)进行。**Handler**有独立于**ServiceCore**的[生命周期和处理流程](/guide/request-handler.html#处理流程)。

客户端请求经过**全局中间件**管道后，将进入与请求路径匹配的**Handler**中执行后续处理。

**我们实现一个Handler至少需要：**

- 指定请求路径规则
- 按请求方式（比如：GET、POST）指定处理逻辑

因此，我们在[自定义Handler](/guide/request-handler.html)时至少需要：

- 实现一个继承自```Core.Handler```的类
- **重写```getRoutePath()```静态方法**，指定请求路径规则
- **重写```methodHandler()```实例方法**，指定对应请求方式的处理逻辑

::: warning 注意
指定请求路径时，需要重写**Handler**中的**静态方法**，即```static getRoutePath()```；而实现某个请求方式的处理逻辑时重写的```methodHandler()```是**实例方法**。

另外，```methodHandler```不是实际重写的方法名，只是**Handler Method**的代称，比如：处理客户端POST请求，需要重写**Handler**中的**实例方法**```postHandler()```。
:::

---

接下来，让我们来实现Hello World Handler：

```javascript
const Core = require('node-corejs');

class HelloWorldHandler extends Core.Handler {
  // 指定请求路径规则
  static getRoutePath() {
    return '/HelloWorld.do';
  }
  // 指定get请求处理
  getHandler(req, res, next) {
    next('Hello World');
  }
}
```

需要注意的是，**Handler必须绑定至ServiceCore才能生效。**

所以，我们还应该使用**ServiceCore**的实例方法```bind()```将**Handler**与**ServiceCore**绑定：

```javascript
const Core = require('node-corejs');

// 实现Hello World Handler
class HelloWorldHandler extends Core.Handler { ... }

// 创建ServiceCore
const serviceCore = new Core.ServiceCore();
// 绑定ServiceCore和Handler
serviceCore.bind([HelloWorldHandler]);
// 启动ServiceCore
serviceCore.start();
```

此时，我们使用浏览器打开```http://localhost:3000/HelloWorld.do```就可以检查实现成果啦！

::: danger 注意
**ServiceCore**实例仅允许在处于关闭状态时执行```bind()```动作，且多次执行```bind()```时将只保留最后一次绑定的**Handler**。
:::

## 日志收集

我们可以通过**ServiceCore**的实例属性```logger```指定其使用的**日志收集工具**。在内部实现上，**ServiceCore**将调用```this.logger.log(level, funcName, message)```输出运行日志。

通常，我们使用Corejs内置的[日期输出器](/guide/logger-introduce.html#日期输出器)作为**ServiceCore**的**日志收集工具**：

```javascript
const serviceCore = new Core.ServiceCore();
// 指定ServiceCore使用DateLogger进行日志收集
serviceCore.logger = new Core.DateLogger({ filePrefix: 'ServiceCore' });
```

::: tip 提示
Corejs内置的**日期输出器**将同一日期周期内产生的日志归档至一个文件（组），且支持自动清理和文件分割。
:::

---

**ServiceCore**运行日志的输出等级、方法名和文案存储在```Core.Macros```和```Core.Messages```中，我们可以通过提前修改这些宏变量的方式实现日志内容定制（比如：日志国际化）。

- ```level```：日志输出等级

  ::: tip 提示
  日志输出等级存储在```Core.Macros```中。
  :::

  | 宏名称                              | 描述        | 默认值         |
  | :--------------------------------- |:---------- | :------------ |
  | ```SERVICE_CORE_INFOS_LOG_LEVEL``` | 信息日志等级 | ```'infos'``` |
  | ```SERVICE_CORE_WARNS_LOG_LEVEL``` | 警告日志等级 | ```'warns'``` |
  | ```SERVICE_CORE_ERROR_LOG_LEVEL``` | 错误日志等级 | ```'error'``` |

- ```funcName```：调用方法名

  ::: tip 提示
  调用方法名存储在```Core.Messages```中。
  :::

  | 宏名称                           | 默认值           |
  | :------------------------------ | :-------------- |
  | ```SERVICE_CORE_FUNCNAME_LOG``` | ```'服务核心'``` |

- ```message```：日志文案内容

  ::: tip 提示
  日志文案内容存储在```Core.Messages```中。

  在构造日志文案内容时可以使用```${VAR_NAME}```的形式引用**内置变量名**以获取特征信息。
  
  > **比如：我们可以使用```'当前状态下无法执行操作:[${funcName}]'```引用内置变量名为```'funcName'```中的信息。**
  :::

  | 宏名称                                           | 描述                                   | 内置变量名                                                             | 输出等级                             |
  | :---------------------------------------------- | :------------------------------------ | :-------------------------------------------------------------------- | :---------------------------------- |
  | ```SERVICE_CORE_MESSAGE_INVALID_STATE```        | 当前状态下不允许执行操作                  | ```funcName```：操作方法名                                              | ```SERVICE_CORE_WARNS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_INVALID_HANDLER```      | 待绑定的Handler类型无效                 | ```index```：Handler位于绑定列表的索引                                    | ```SERVICE_CORE_WARNS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_INVALID_ROUTE_PATH```   | 待绑定的Handler请求路径无效              | ```routePath```：Handler的请求路径                                      | ```SERVICE_CORE_WARNS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_INVALID_PARAM_TYPE```   | 设置全局拦截器/错误拦截器/构建过程时参数无效 | 无                                                                    | 抛出异常，不产生日志                   |
  | ```SERVICE_CORE_MESSAGE_SUCCESS_BIND_HANDLER``` | 成功绑定Handler                        | ```routePath```：Handler的请求路径                                      | ```SERVICE_CORE_INFOS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_SUCCESS_START_SERVER``` | ServiceCore启动成功                    | ```serverType```：ServiceCore的服务类型；```baseRoutePath```：基础请求路径 | ```SERVICE_CORE_INFOS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_FAILURE_START_SERVER``` | ServiceCore启动失败                    | ```error```：启动失败的原因                                              | ```SERVICE_CORE_ERROR_LOG_LEVEL```  |
