# 请求处理

## 介绍

**Handler必须绑定至ServiceCore使用。在ServiceCore拦截器、中间件阶段执行完成后进入Handler处理**。ServiceCore每次接收到有效的用户请求时，将会根据与请求匹配的Handler创建Handler实例，并将用户请求导入Handler实例执行处理。即：ServiceCore是Handler执行的容器，负责全局级别处理；Handler根据用户请求路径执行个性化处理。

实现自定义Handler时需要继承```Core.Handler```并重写相关方法，在本章中将介绍常用场景下如何定制Handler。

## 设置请求路径

ServiceCore在执行绑定Handler时，将获取绑定列表中每个Handler设置的请求路径，对请求路径做出校正并缓存在ServiceCore，校正规则为：**若Handler设置的请求路径不以```'/'```开头，将自动附加```'/'```作为请求路径前缀。**

在ServiceCore全局拦截器默认行为中，**收到用户请求时会检查用户请求路径是否命中缓存中的某个Handler设置的请求路径，若未命中直接返回404状态码，不再执行后续处理。**

通过重写Handler的```static getRoutePath()```方法设置请求路径，**实现Handler时必须设置请求路径。**

样例中实现了一个请求路径为```'/Test.do'```的Handler：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 复写getRoutePath()时仅支持return方式设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## Handler处理流程

![Handler处理流程](/images/Handler处理流程.jpg)

## Handler初始化

**每次ServiceCore接收到有效请求时，将创建请求路径对应Handler的实例，此时将执行实例的```initHandler()```发起初始化指令。初始化过程中产生了未捕获的异常将被[统一错误处理](#统一错误处理)捕获。**

Handler初始化操作中一般创建请求所需的静态资源和动态资源，这些资源可以挂载至```this```中在整个Handler中共享。

- 动态资源：与用户请求相关的资源，比如：链路追踪器、日志输出器等。
- 静态资源：与用户请求无关的资源，比如：数据库操作实例、RPC通信实例等。

ServiceCore执行Handler初始化通过```await initHandler()```方式进行，因此，在初始化时进行异步操作时可以使用Promise。

样例中实现了同步/异步初始化操作：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // 同步初始化 - 实例化Logger后，请求将继续处理
  initHandler(serviceCore, req, res) {
    super.initHandler(serviceCore, req, res);
    this.logger = new Core.BaseLogger();
    this.logger.log('处理开始');
  }

  // 异步初始化 - 实例化Logger后，1秒后请求将继续处理
  initHandler(serviceCore, req, res) {
    return new Promise((resolve) => {
      super.initHandler(serviceCore, req, res);
      this.logger = new Core.BaseLogger();
      this.logger.log('处理开始');
      setTimeout(() => resolve(), 1000);
    });
  }

  // 定义GET请求处理
  getHandler(req, res, next) {
    next('done');
  }

  // 处理结束
  onFinished(data, req, res) {
    super.onFinished(data, req, res);
    this.logger.log('处理结束');
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## Handler中间件

**Handler中间件支持所有Express生态中间件，支持[动态中间件](/guide/dynamic-middleware)**。本节仅描述设置Handler级别中间件的用法，[动态中间件](/guide/dynamic-middleware)将于高阶功能中描述。**中间件执行过程中产生了未捕获的异常将被[统一错误处理](#统一错误处理)捕获。**

动态中间件包括：

- 处理每个用户请求时，根据实际请求情况动态生成中间件列表。
- 执行每个中间件时，根据上一个中间件结果或实际请求情况控制中间件执行行为，比如丢弃执行结果跳过执行等。

自定义Handler时，需要重写```getMiddlewares()```配置Handler级别的中间件，支持同步/异步设置中间件。当Handler初始化完成后会调用```getMiddlewares()```获取待执行的中间件列表进入Handler中间件阶段。

样例中实现了同步/异步构建中间件列表：

```javascript
const express = require('express');
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/source';
  }

  // 同步返回中间件
  getMiddlewares(req, res) {
    return [express.static('./source')];
  }

  // 异步返回中间件
  getMiddlewares(req, res) {
    return new Promise((resolve) => {
      setTimeout(() => resolve([express.static('./source')]), 1000);
    });
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## 请求预处理

在Handler中间件阶段结束后（即：中间件列表最后一个中间件执行完成且被完成确认后），核心处理流程将分发用户请求进入预处理阶段继续处理。一些通用业务层逻辑（比如：请求参数解析与校验）可以在此阶段进行，通过重写```preHandler()```自定义请求预处理逻辑。

在预处理阶段即将结束时，使用流程控制方法```next()```指定后续处理流程：

- 执行```next()```：核心处理流程将会根据用户请求方式，分发至对应的请求方式处理器执行[请求后处理](#请求后处理)。比如：用户请求方式为POST，核心流程将调用```postHandler()```进行后处理。
- 执行```next(err)```：核心流程将分发请求至[统一错误处理](#统一错误处理)。
- 执行```next(data)```：核心流程将分发请求至[统一结束处理](#统一结束处理)。

::: warning 注意
- 请求预处理默认直接执行```next()```进入后处理阶段。
- 执行```next(data)```时，data可能为```null```或```undefined```，而中间件阶段的流程控制方法入参为```null```或```undefined```表示执行下一个中间件。
:::

样例实现了在Handler预处理阶段处理基础入参：

```javascript
const Core = require('node-codejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // 请求预处理
  preHandler(req, res, next) {
    const query = req.query;
    const value = query.value;
    // value未填或无效时返回200状态码下的错误文案
    if (value === '' || isNaN(value)) {
      next('必填参数为空');
    }
    // value为0时返回500状态码
    else if (parseInt(value) === 0) {
      next(new Error('value不能为0'))
    }
    // value为其他时执行后处理
    else {
      this.value = value;
      next();
    }
  }

  // GET请求后处理
  getHandler(req, res, next) {
    next((parseInt(this.value) + 1).toString());
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## 请求后处理

在Handler请求预处理阶段即将结束时，若通过流程控制方法```next()```决定进入后处理阶段，核心处理流程将根据用户请求方式执行对应的请求处理器。比如：用户请求方式为POST，核心流程将调用```postHandler()```执行后续请求处理。用户请求对应的实际业务处理一般发生在此阶段，通过重写对应的Method Handler自定义请求后处理逻辑。

在后处理阶段即将结束时，使用流程控制方法```next()```指定后续处理流程：

- 执行```next(err)```：核心流程将分发请求至[统一错误处理](#统一错误处理)。
- 执行```next(data)```：核心流程将分发请求至[统一结束处理](#统一结束处理)。

::: warning 注意
- 请求后处理的默认行为是：尝试根据请求方式构建Method Handler的方法名，若Method Handler方法在Handler有定义则直接调用；否则调用```_defaultHandler()```，此方法默认直接向客户端返回404状态码。
- 若后处理阶段即将结束时执行了```next()```，Handler将认为调用```next(undefined)```，将分发请求至[统一结束处理](#统一结束处理)。
:::

## 统一结束处理

在Handler处理任意阶段调用了```next(data)```将进入统一结束处理。此阶段为请求处理的末端，用于统一向客户端返回业务请求处理结果。通过重写```onFinished()```自定义统一结束处理逻辑。

::: warning 注意
- 在中间件阶段中，执行```next(null)```或```next(undefined)```时，Handler将分发下一个中间件而不是进入统一结束处理。
- 在预处理阶段中，执行```next(null)```或```next(undefied)```时表现与中间件阶段不同，此时Handler核心流程将进入统一结束处理。
- 在后处理阶段中，执行```next()```与执行```next(undefined)```表现一致，此时Handler核心流程将进入统一结束处理。
:::

默认行为下，统一结束处理使用```res.status(200).send()```向用户返回流程控制方法```next(data)```带入的```data```。

样例将以默认统一结束处理演示使用方式：

```javascript
const Core = require('node-codejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // 统一结束处理
  onFinished(data, req, res) {
    res.status(200).send(data);
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## 统一错误处理

在Handler处理过程中出现了未被捕获的异常或任意阶段调用了```next(err)```将进入统一错误处理，此阶段为请求处理的末端，用于统一收口请求处理过程中的错误处理，一般情况下需要向客户端返回数据。通过重写```onError()```自定义统一错误处理逻辑。

样例将以默认统一错误处理演示使用方式：

```javascript
const Core = require('node-codejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // 统一错误处理
  onError(err, req, res) {
    res.status(500).end();
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```
