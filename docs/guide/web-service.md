# Web服务

## 启动Web服务

通过创建Corejs的Web服务组件ServiceCore的实例启动Web服务，通过调整ServiceCore实例化配置控制Web服务运行参数。

::: tip 提示
ServiceCore默认运行在3000端口。
:::

样例中使用默认配置启动ServiceCore：

```javascript
const Core = require('node-corejs');
// 创建ServiceCore
const serviceCore = new Core.ServiceCore();
// 启动ServiceCore
serviceCore.start((err) => {
  if (err) {
    console.log(`服务启动失败: ${err}`);
    return;
  }
  console.log('服务启动成功');
});
```

## 启用TLS/SSL

在创建ServiceCore实例时，如果指定驻留端口为443，则必须在```ssl```配置中设置TLS/SSL密钥和证书，否则将无法成功启动ServiceCore：

```javascript
const Core = require('node-corejs');
// 其中ssl.key为TLS/SSL密钥
// 其中cert.pem为TLS/SSL证书(链)
const serviceCore = new Core.ServiceCore({
  port: 443,
  ssl: {
    key: './ssl.key',
    cert: './cert.pem',
  }
});
serviceCore.start((err) => {
  if (err) {
    console.log(`服务启动失败: ${err}`);
    return;
  }
  console.log('服务启动成功');
});
```

## 自定义构建过程

ServiceCore**启动时**默认使用node原生的```http.createServer()```或```https.createServer()```创建最终承载Web服务的Server实例。如果有特殊场景需要变更Server实例的构建过程，在**执行启动前**更改ServiceCore实例的```createServer```属性即可。

::: danger 注意
自定义Server构建过程时，```createServer```方法中需要包含Server实例构建和启动逻辑。
:::

样例代码中以默认Server构建行为演示如何变更构建过程：

```javascript
const Core = require('node-corejs');
const serviceCore = new Core.ServiceCore();
// 必须在执行start()之前变更Server构建过程
// 参数列表: Express实例、ServiceCore配置、cps风格执行回调
serviceCore.createServer = (app, configs, callBack) => {
  // 根据驻留端口创建Server实例 - port为443时校验ssl配置后使用https创建实例,否则直接使用http创建实例
  const { port, ssl } = configs;
  let server = null;
  if (port === 443) {
    if (!ssl.cert || !ssl.key) {
      // 抛出无效的SSL配置项错误,此宏位于Core.Macro中
      throw new Error(SERVICE_CORE_MESSAGE_INVALID_SSL_OPTIONS);
    }
    server = https.createServer(ssl, app);
  }
  else {
    server = http.createServer(app);
  }
  // 启动Server实例
  server.on('error', callBack);
  server.listen(port, () => { callBack(null, { app, server }) });
}
serviceCore.start();
```

## 请求处理模型

![请求处理模型](/images/请求处理流程.jpg)

## 全局拦截器

**ServiceCore拦截器为全局拦截器，在ServiceCore启动时，封装拦截器为Express标准中间件挂载至Express中间件列表的最前端以实现拦截全部用户请求功能**，因此接收到用户请求时，可以在全局拦截器中决定是否放行此次请求进入下游处理。

全局拦截器是Express标准中间件，使用```next()```分发处理流程至下游。若在全局拦截器执行过程中产生了未捕获的异常，将进入[错误拦截器](#错误拦截器)处理。

```javascript
serviceCore.globalIntercaptor = (req, res, next) => { 
  // 执行全局拦截器逻辑
  // ...
  next();
}
```

::: danger 注意
在全局拦截器的默认行为下，如果用户请求路径未匹配到任何一个Handler，则认为请求无效，直接返回404状态码，不再进入后续全局中间件和Handler阶段处理。

所以，如果在全局中间件中使用了静态资源中间件（如：```express.static```），**在默认拦截器行为下可能导致所有静态资源请求无效**。此时需要**变更全局拦截器拦截逻辑**，放行相关资源请求或**将静态资源中间件置于Handler维度**。
:::

**在ServiceCore启动前**，可以对实例```globalInterceptor```属性进行更改以变更全局拦截器处理行为：

```javascript
const Core = require('node-corejs');
const serviceCore = new ServiceCore();
// 必须在执行start()之前变更全局拦截器逻辑
serviceCore.globalIntercaptor = (req, res, next) => {
  const requestPath = req.path;
  // 将过滤请求路径不以serviceCore配置baseRoutePath开头且未匹配到任何Handler的用户请求
  const isHandlerBinded = !!Object
    .keys(serviceCore._handlerMap)
    .find((handlerRoutePath) => requestPath.indexOf(serviceCore.baseRoutePath) === 0 && requestPath.indexOf(handlerRoutePath) !== -1);
  isHandlerBinded ? next() : res.status(404).end();
}
serviceCore.start();
```

## 全局中间件

**在ServiceCore维度设置的中间件为全局中间件，支持所有Express生态中间件**，比如body-parser、multer等。

::: danger 注意
如果在全局中间件中使用了静态资源中间件，则需要修改[全局拦截器](#全局拦截器)的默认处理逻辑，针对静态资源请求予以放行。
:::

**注意：Handler维度可以根据用户请求路径、参数等动态挂载中间件列表，同样支持所有Express生态中间件**。全局中间件阶段结束后ServiceCore将分发用户请求进入对应的Handler处理，即：全局中间件在Handler中间件之前执行。

**ServiceCore将全局中间件列表中的中间件逐个挂载至Express中间件列表（位于全局拦截器之后）**。此时，对于在全局拦截器中放行的用户请求，将进入全局中间件阶段继续处理。在全局中间件阶段，中间件列表中的中间件将逐个执行。若中间件执行过程中请求返回，则认为请求处理结束不再进入后续处理；执行过程中产生了未捕获的异常将进入[错误拦截器](#错误拦截器)中处理。

样例代码使用body-parser对有效请求进行body解析：

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

**全局中间件阶段不支持动态中间件**，若有中间件逻辑控制场景，推荐使用Wrapper实现。

样例代码根据body-parser解析结果进行自定义处理，解析异常时使用200状态码返回异常信息：

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

**ServiceCore将全局错误拦截器封装为Express标准中间件挂载至Express中间件列表的最末端**，因此，错误拦截器与Express错误处理中间件表现相同：仅可捕获同步异常（全局拦截器执行阶段、全局中间件执行阶段），若要捕获异步产生的异常需要进行特殊处理（可参考Express文档中对错误捕获的相关描述，比如使用```next(err)```）。

::: warning 注意
- Handler处理过程中未捕获的异常将在Handler[统一错误处理](/guide/request-handler.html#统一错误处理)中被捕获，与ServiceCore错误拦截器无关。
- 设置Express错误处理中间件时，参数列表必须为```(err, req, res, next)```，而在设置错误拦截器时，ServiceCore将会自动包装错误拦截器为标准错误处理中间件挂载至Express，无需关注参数列表。
:::

**在ServiceCore启动前**，可以对实例```errorInterceptor```属性进行更改以变更错误拦截器处理行为：

```javascript
const Core = require('node-corejs');
const serviceCore = new Core.ServiceCore();
// 必须在执行start()之前变更错误拦截器逻辑
serviceCore.errorInterceptor = (err, req, res, next) => { res.status(500).end() };
serviceCore.start();
```

## 设置请求路径

ServiceCore针对特定路径的[请求处理](/guide/request-handler)需要配合Handler实现，Handler有独立的生命周期和处理流程。**全局中间件处理结束后**，用户请求进入与请求路径匹配的Handler执行后续处理。

**使用继承的方式实现Handler**，通过重写```static getRoutePath()```指定用户请求路径规则，ServiceCore将分发符合规则的请求进入Handler处理。处理特定请求方式的用户请求需要实现与请求方式对应的```Handler Method```，比如：需要处理用户POST方式请求，重写Handler中```postHandler(req, res, next)```即可。

Handler必须绑定至ServiceCore才能使请求路径生效，**绑定操作必须在ServiceCore启动前进行**，多次绑定仅保留最后一次绑定的Handler列表。

```javascript
const Core = require('node-corejs');

// 实现自定义Handler
class TestHandler extends Core.Handler {
  static getRoutePath() {
    return '/Test.do';
  }

  getHandler(req, res, next) {
    next('Hello World');
  }
}

// 创建ServiceCore进行绑定并启动
const serviceCore = new Core.ServiceCore();
serviceCore.bind([TestHandler]);
serviceCore.start();
```

## 日志收集

ServiceCore支持通过外部注入日志输出器的方式进行日志收集，ServiceCore内部通过调用输出器的```log(level, funcName, message)```输出日志。

参数说明：

- ```level```：日志等级
  > 通过在实例化ServiceCore前修改宏的方式实现对日志输出等级的变更：
  > | 宏名称                                         | 描述        | 默认值         |
  > | :-------------------------------------------: |:----------:| :------------:|
  > | ```Core.Macro.SERVICE_CORE_INFOS_LOG_LEVEL``` | 信息日志等级 | ```'infos'``` |
  > | ```Core.Macro.SERVICE_CORE_WARNS_LOG_LEVEL``` | 警告日志等级 | ```'warns'``` |
  > | ```Core.Macro.SERVICE_CORE_ERROR_LOG_LEVEL``` | 错误日志等级 | ```'error'``` |
- ```message```：文案内容
  > 通过在实例化ServiceCore前修改宏的方式实现对日志输出文案的变更：
  > | 宏名称                                                        | 描述                                   | 输出等级 |
  > | :----------------------------------------------------------  | :-----------------------------------: | :----: |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_INVALID_STATE```        | 当前状态下不允许执行操作                  | ```Core.Macro.SERVICE_CORE_WARNS_LOG_LEVEL``` |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_INVALID_HANDLER```      | 待绑定的Handler类型无效                  | ```Core.Macro.SERVICE_CORE_WARNS_LOG_LEVEL``` |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_INVALID_ROUTE_PATH```   | 待绑定的Handler请求路径无效              | ```Core.Macro.SERVICE_CORE_WARNS_LOG_LEVEL``` |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_INVALID_SSL_OPTIONS```  | SSL配置无效                            | 抛出异常 |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_INVALID_PARAM_TYPE```   | 设置全局拦截器/错误拦截器/构建过程时参数无效 | 抛出异常 |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_SUCCESS_BIND_HANDLER``` | 成功绑定Handler                        | ```Core.Macro.SERVICE_CORE_INFOS_LOG_LEVEL``` |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_SUCCESS_START_SERVER``` | ServiceCore启动成功                    | ```Core.Macro.SERVICE_CORE_INFOS_LOG_LEVEL``` |
  > | ```Core.Message.SERVICE_CORE_MESSAGE_FAILURE_START_SERVER``` | ServiceCore启动失败                    | ```Core.Macro.SERVICE_CORE_ERROR_LOG_LEVEL``` |
- ```funcName```：调用方法名
  > 通过在实例化ServiceCore前修改宏的方式实现对调用方法名的变更：
  >   - ```Core.Message.SERVICE_CORE_FUNCNAME_LOG```：默认值：```'服务核心'```

```javascript
const Core = require('node-corejs');
// BaseLogger中包含符合条件的log()方法
const serviceCore = new Core.ServiceCore({ logger: new Core.BaseLogger() });
serviceCore.start();
```
