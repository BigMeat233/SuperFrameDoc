# Web服务

## 启动Web服务

使用Corejs内置的**ServiceCore**创建和维护Web服务。

首先，我们需要创建**ServiceCore**的实例。

```javascript
const Core = require('node-corejs');
const serviceCore = new Core.ServiceCore();
```

使用```new Core.ServiceCore()```创建**ServiceCore**实例时可以传入Web服务的配置对象```configs```：

- ```configs.id```：**ServiceCore**的ID，用于标识**ServiceCore**。非必填项，默认值：```ServiceCore_${generateRandomString(6, 'uln')}```;
- ```configs.port```：Web服务驻留的端口。非必填项，默认值：```3000```。
- ```configs.ssl```：Web服务的TLS/SSL配置。当```configs.port```为```443```时必填，默认值：```{}```。
- ```configs.ssl.cert```：TLS/SSL证书（链）。可以使用```String```指定证书文件路径；也可以使用```Buffer```指定证书内容。
- ```configs.ssl.key```：TLS/SSL证书密钥。可以使用```String```指定证书密钥路径；也可以使用```Buffer```指定证书密钥内容。
- ```configs.baseRoutePath```：Web服务的基础请求路径，用于指定统一的请求路径前缀。非必填项，默认值：```'/'```。
  > 比如，当此配置为```'/api'```，ServiceCore挂载了请求路径为```'/Test.do'```的Handler时，客户端需要请求```'/api/Test.do'```。

  ::: warning 注意

  - 当此配置不以```'/'```开头时，将自动附加```'/'```作为前缀。比如：当业务层配置此项为```'api'```，将自动被调整为```'/api'```。
  - 当此配置以```'/'```结尾时，将自动删除位于结尾的所有```'/'```。比如：当业务层配置此项为```'/api//'```，将自动被调整为```'/api'```。

  :::

- ```configs.middlewares```：全局中间件列表。非必填项，默认值：```[]```。
- ```configs.logger```：日志输出器，指定内部日志输出使用的输出器。非必填项，默认为空日志输出器。

---

然后，我们使用```start()```方法启动Web服务，**ServiceCore**实例将按照配置中指定的参数运行。

```javascript
serviceCore.start();
```

```start()```接收一个回调函数，用于捕获Web服务启动状态；可以在这个回调函数中对Web服务启动成功或失败进行相应的处理。

```javascript
serviceCore.start((err) => {
  // 如果err为null则表示Web服务启动成功
  if(err) {
    // Web服务启动失败
    console.log(`服务启动失败: ${err}`);
    return;
  }
  // Web服务启动成功
  console.log('服务启动成功');
});
```

需要注意的是，```start()```执行成功后将**ServiceCore**变更为启动状态，仅允许在关闭状态执行的操作将被拒绝执行：

- [设置全局拦截器](#全局拦截器)
- [设置错误拦截器](#错误拦截器)
- [自定义构建过程](#自定义构建过程)

## 启用TLS/SSL

在创建**ServiceCore**实例时，如果指定的服务驻留端口为```443```，则**必须设置TLS/SSL证书（链）和证书密钥**。

我们可以通过```configs.ssl```配置项指定TLS/SSL证书（链）和证书密钥，否则执行```start()```时将从回调函数中得到一个```err```。

```javascript
const Core = require('node-corejs');
const SSL_KEY_PATH = './ssl.key';
const SSL_CERT_PATH = './cert.pem';

const serviceCore = new Core.ServiceCore({
  port: 443,
  // 指定TLS/SSL证书（链）和证书密钥的文件路径
  ssl: {
    key: SSL_KEY_PATH,
    cert: SSL_CERT_PATH
  }
});
```

**ServiceCore**使用```https.createServer()```实现Web服务的TLS/SSL。因此，我们也可以使用将TLS/SSL证书（链）和证书密钥装入```Buffer```中的形式创建**ServiceCore**。

```javascript
const fs = require('fs');
const Core = require('node-corejs');
const key = fs.readFileSync('./ssl.key');
const cert = fs.readFileSync('./cert.pem');

const serviceCore = new Core.ServiceCore({
  port: 443,
  // 指定TLS/SSL证书（链）和证书密钥的文件内容
  ssl: { key, cert }
});
```

## 自定义构建过程

**ServiceCore**执行```start()```时默认使用node原生API```http.createServer()```或```https.createServer()```构建承载Web服务的Server实例。

**ServiceCore**最终调用```createServer()```构建Server实例。因此，我们可以向**ServiceCore实例**的```createServer```属性指定新的构建方法，在方法中实现自定义的构建过程即可完成对**ServiceCore**默认构建行为的更改。

需要注意的是，**任何在ServiceCore实例启动状态下对```createServer```属性的变更操作将被拒绝。**

::: danger 注意
```createServer```执行过程中需要包含**构建Server**和**启动Server**。
:::

```createServer```属性仅接收```Function```，其参数列表为：

- ```app```：**ServiceCore**依赖的Express实例。
- ```configs```：**ServiceCore**使用的配置。
  > 在创建**ServiceCore**时，将对构造参数传入的配置进行兜底和校正处理。因此，此值可能与创建**ServiceCore**传入的构造参数有差异。
- ```callBack```：回调函数，参数列表为```(err, detail)```。
  > 在构建结束时需要调用```callBack()```向**ServiceCore**返回构建结果。当回传的```err```为非```null```的值时表示构建成功，**ServiceCore**变更为启动状态并向业务层回抛构建结果。

  ::: tip 说明
  ```start()```通过回调函数向业务层回传的结果将来自于执行```callBack()```时传入的```err```和```detail```。
  :::

样例代码中以默认构建行为演示如何自定义构建过程。在变更默认构建行为后如果期望复原可以使用以下代码：

```javascript
const Core = require('node-corejs');
const serviceCore = new Core.ServiceCore();

// 直接修改createServer属性
serviceCore.createServer = (app, configs, callBack) => {
  // 根据驻留端口创建Server实例
  const { port, ssl } = configs;
  let server = null;
  // port为443时 - 校验ssl配置后使用https创建实例
  if (port === 443) {
    if (!ssl.cert || !ssl.key) {
      throw new Error(Core.Macros.SERVICE_CORE_MESSAGE_INVALID_SSL_OPTIONS);
    }
    server = https.createServer(ssl, app);
  } 
  // port不为443时 - 使用http创建实例
  else {
    server = http.createServer(app);
  }
  // 启动Server实例
  server.on('error', callBack);
  server.listen(port, () => { callBack(null, { app, server }) });
}
```

## 请求处理模型

![请求处理模型](/images/请求处理流程.jpg)

## 全局拦截器

**ServiceCore实现全局拦截器的原理是构造包含拦截器逻辑的Express标准中间件，将其挂载至Express中间件列表首位拦截客户端流量**。在**ServiceCore实例**执行```start()```时，将使用```app.use()```挂载全局拦截器。

因此，我们可以在执行```start()```前向**ServiceCore实例**的```globalIntercaptor```属性指定新的全局拦截器：

```javascript
// 在执行start()前指定globalIntercaptor
serviceCore.globalIntercaptor = (req, res, next) => { 
  // 执行全局拦截器逻辑
  // ...
  // 拦截器逻辑结束后执行next()分发处理流程至下游链路
  next();
};
```

::: tip 说明
**全局拦截器**是挂载至Express中间件列表首位的**标准中间件**，错误处理与运行方式与**Express标准中间件**保持一致，详情可以查阅[Express官方文档](http://expressjs.com/en/guide/using-middleware.html);

需要特别注意的是，**ServiceCore**引入了[错误拦截器](#错误拦截器)对**Exress标准中间件**运行过程中产生的异常进行处理。因此，我们可以在[错误拦截器](#错误拦截器)处理**全局拦截器**中未被捕获或使用```next(err)```抛出的异常。
:::

**全局拦截器**仅接收```Function```，其参数列表为：

- ```req```：客户端请求实例。
- ```res```：客户端返回实例。
- ```next```：流程控制函数。
  > - 执行```next()```分发处理流程至下游链路。
  > - 执行```next(err)```触发[全局错误处理](#错误拦截器)。

---

当**ServiceCore**收到客户端请求时，首先进入**全局拦截器**处理。在**全局拦截器**默认行为下，如果客户端请求路径未能匹配到Handler，则认为请求无效直接返回404状态码，不再进入后续的[全局中间件](#全局中间件)和[Handler阶段](/guide/request-handler.html)。

因此，如果在[全局中间件](#全局中间件)中使用了泛路径中间件（如：```express.static```），在默认拦截器行为下可能导致请求无效。此类场景下，我们可以尝试：

- 将泛路径中间件变更至Handler维度。
- 变更全局拦截器默认行为，放行相关请求。

样例代码中以默认全局拦截器行为演示如何变更全局拦截器。在变更全局拦截器默认行为后如果期望复原可以使用以下代码：

```javascript
// 在执行start()前指定globalIntercaptor
serviceCore.globalIntercaptor = (req, res, next) => {
  const requestPath = req.path;
  const routePathes = Object.keys(serviceCore._handlerMap);
  let isHandlerBinded = false;
  // 使用for循环降低性能开销
  for (let i = 0; i < routePathes.length; i++) {
    const handlerRoutePath = routePathes[i];
    if (requestPath.indexOf(serviceCore.baseRoutePath) === 0 && requestPath.indexOf(handlerRoutePath) !== -1) {
      (isHandlerBinded = true) && next();
      break;
    }
  }

  !isHandlerBinded && res.status(404).end();
}
```

## 全局中间件

**ServiceCore**支持在两个维度设置中间件：

- 全部有效请求。
- 特定路径的请求。

**针对所有有效请求的中间件称为全局中间件**。由**ServiceCore**构造参数```configs.middlewares```配置项指定：

```javascript
const serviceCore = new Core.ServiceCore({
  middlewares: [] // 指定全局中间件列表
});
```

**针对特定路径请求使用的中间件在[自定义Handler](/guide/request-handler.html#handler中间件)时指定**。我们可以在**自定义Handler**时根据客户端请求的实际上下文（比如：请求参数）动态指定中间件列表；也可以在中间件执行过程中控制执行链路（比如：跳过执行）。

需要注意的是，**ServiceCore将在全局中间件处理结束后分发客户端请求进入与请求路径对应的Handler处理**，即：全局中间件在Handler中间件之前执行。

::: tip 提示
**ServiceCore**在任意维度使用的中间件兼容Express生态，我们可以直接使用```body-parser```、```multer```等。
:::

---

**ServiceCore**执行```start()```时，当挂载**全局拦截器**完成后，会将构造参数```configs.middlewares```内的中间件依次使用```app.use()```挂载至Express实例，以完成**全局中间件**挂载。

因此，客户端请求于**全局拦截器**放行之后进入**全局中间件**处理，我们在**全局中间件**中使用泛路径中间件（如：```express.static```）时可能会被**全局拦截器**拦截。

::: tip 说明
**全局中间件是直接挂在至Express实例的标准中间件**。执行```next(err)```或未被捕获的异常都将进入[错误拦截器](#错误拦截器)；若**全局中间件**执行过程中请求返回，则认为请求处理结束不再进入后续处理流程。
:::

样例代码使用```body-parser```对有效请求进行解析：

```javascript
const Core = require('node-corejs');
const bodyParser = require('body-parser');
// 创建中间件
const jsonParser = bodyParser.json({ limit: 2 * 1024 * 1024 });
const urlEncodedParser = bodyParser.urlencoded({ limit: 2 * 1024 * 1024, extended: true });
// 创建ServiceCore并启动
const serviceCore = new Core.ServiceCore({
  middlewares: [jsonParser, urlEncodedParser]
});
serviceCore.start();
```

需要注意的是，**全局中间件不支持动态中间件**。在一些需要中间件逻辑控制场景中，我们可以使用Middleware Wrapper实现。

样例代码根据```body-parser```解析结果进行自定义处理，解析异常时不再向客户端抛出500状态码，而是使用200状态码向客户端返回异常信息：

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

**ServiceCore**引入了**错误拦截器**对**Exress标准中间件**运行过程中产生的异常进行处理，即**全局拦截器**和**全局中间件**中使用```next(err)```或未被捕获的异常都将进入**错误拦截器**统一处理。

**ServiceCore**执行```start()```时，在挂载**全局拦截器**和**全局中间件**完成后，将**错误拦截器**封装为**Express标准错误中间件**并使用```app.use()```挂载至Express实例。此时，**错误拦截器**对应的**Express标准错误中间件**位于Express中间件列表的最末位，将捕获到所有**Express标准中间件**产生的异常。

::: tip 说明
**ServiceCore**提供了两个维度的错误捕获：

- **全局拦截器**和**全局中间件**中产生的异常进入**错误拦截器**。
- **Handler**处理过程中产生的异常进入[统一错误处理](/guide/request-handler.html#统一错误处理)。

**在设置错误拦截器时，ServiceCore将自动包装错误拦截器为Express标准错误中间件，无需关注参数列表。**

需要注意的是，**错误拦截器**使用Express提供的**Express标准错误中间件**实现。因此，仅可捕获到**全局拦截器**和**全局中间件**执行过程中产生的**同步异常**，关于**Express标准错误中间件**的使用方式可以查阅[Express官方文档](https://expressjs.com/en/guide/error-handling.html#error-handling)。
:::

在**ServiceCore**启动前，我们可以通过修改**ServiceCore实例**的```errorInterceptor```属性变更错误拦截器：

```javascript
// 在执行start()前指定errorInterceptor
serviceCore.errorInterceptor = (err, req, res) => { 
  res.status(500).end();
};
```

## 设置请求路径

**ServiceCore**针对请求路径的请求处理需要配合[Handler](/guide/request-handler.html)实现，Handler有独立的[生命周期和处理流程](/guide/request-handler.html#handler处理流程)。**全局中间件**处理结束后，客户端请求将进入与请求路径匹配的**Handler**执行后续处理。

首先，我们先来讨论**Handler**的基本使用方法：

- 指定请求路径规则。
- 按请求方式（比如：GET、POST）分流处理。

因此，我们在[自定义Handler](/guide/request-handler.html)时至少需要做三件事：

- 实现一个继承自```Core.Handler```的类。
- **重写```getRoutePath()```静态方法**，指定请求路径规则。
- **重写```methodHandler()```实例方法**，拦截期望方式的请求进行处理。

::: warning 注意
指定请求路径时，需要重写**静态方法**，即```static getRoutePath()```；而实现请求处理时重写的```methodHandler()```是**实例方法**。

另外，```methodHandler```不是实际重写的方法名，只是**Handler Method**的代称，比如：处理客户端POST请求，需要重写**Handler**中的```postHandler()```。
:::

---

让我们来自定义一个Hello World Handler：

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

另外我们需要注意的是，**Handler**必须绑定至**ServiceCore**才能生效。

所以，我们应该在执行```start()```前使用```bind()```将**Handler**与**ServiceCore**绑定：

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

## 日志收集

**ServiceCore**支持由构造参数```configs.logger```配置项指定日志输出器的方式进行日志收集，默认使用空日志输出器（即：具有空```log()```方法的实例对象）。在内部实现上，**ServiceCore**调用输出器实例的```log(level, funcName, message)```输出日志。

通常，我们使用Corejs内置的[日期输出器](/guide/logger-introduce.html#日期输出器)作为**ServiceCore**的日志输出器：

::: tip 提示
Corejs内置的**日期输出器**将同一周期内产生的日志归档至一个文件（组），支持自动清理和文件分割。
:::

```javascript
const serviceCore = new Core.ServiceCore({
  // 指定ServiceCore使用DateLogger进行日志收集
  logger: new Core.DateLogger({ filePrefix: 'ServiceCore' })
});
```

---

日志的输出等级、方法名和文案被存储在```Core.Macros```和```Core.Messages```中，我们可以通过提前修改这些宏变量的方式实现日志内容定制（比如：日志国际化）。

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
  :::

  | 宏名称                                           | 描述                                   | 输出等级                             |
  | :---------------------------------------------- | :------------------------------------ | :---------------------------------- |
  | ```SERVICE_CORE_MESSAGE_INVALID_STATE```        | 当前状态下不允许执行操作                  | ```SERVICE_CORE_WARNS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_INVALID_HANDLER```      | 待绑定的Handler类型无效                 | ```SERVICE_CORE_WARNS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_INVALID_ROUTE_PATH```   | 待绑定的Handler请求路径无效              | ```SERVICE_CORE_WARNS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_INVALID_SSL_OPTIONS```  | SSL配置无效                            | 抛出异常，不产生日志                   |
  | ```SERVICE_CORE_MESSAGE_INVALID_PARAM_TYPE```   | 设置全局拦截器/错误拦截器/构建过程时参数无效 | 抛出异常，不产生日志                   |
  | ```SERVICE_CORE_MESSAGE_SUCCESS_BIND_HANDLER``` | 成功绑定Handler                        | ```SERVICE_CORE_INFOS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_SUCCESS_START_SERVER``` | ServiceCore启动成功                    | ```SERVICE_CORE_INFOS_LOG_LEVEL```  |
  | ```SERVICE_CORE_MESSAGE_FAILURE_START_SERVER``` | ServiceCore启动失败                    | ```SERVICE_CORE_ERROR_LOG_LEVEL```  |
