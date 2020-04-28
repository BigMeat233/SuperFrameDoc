# 请求处理

## 介绍

**Handler必须绑定至ServiceCore使用**。在全局拦截器、全局中间件阶段处理结束后，ServiceCore将使用与请求匹配的Handler创建Handler实例，并将用户请求导入Handler实例继续处理。即：ServiceCore是Handler执行的容器，负责全局逻辑控制和请求前置处理；在Handler根据实际请求情况针对性处理。

自定义Handler通过继承```Core.Handler```并重写相关方法方式进行，在本章中将介绍常用场景下如何自定义Handler。

## 设置请求路径

ServiceCore绑定Handler时，将获取待绑定列表中每个Handler设置的请求路径，对请求路径做出校正并缓存请求路径规则与Handler的映射关系。

::: tip 路径校正规则
Handler中设置的请求路径不以```'/'```开头时，ServiceCore将自动为请求路径附加```'/'```前缀。
:::

::: warning 注意
在全局拦截器默认行为下，收到用户请求时会**检查用户请求路径是否命中某个Handler的请求路径规则**，若未命中直接返回404状态码，不再进入全局中间件阶段和Handler处理阶段。
:::

通过重写Handler的```static getRoutePath()```设置请求路径，**实现Handler时必须设置请求路径。**

样例代码中实现了一个请求路径为```'/Test.do'```的Handler：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 重写getRoutePath()时仅支持return方式设置请求路径
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

**每次ServiceCore接收到有效请求时，将创建与请求路径对应Handler的实例，实例化后执行实例的```initHandler()```发起Handler初始化指令。初始化过程中产生了未捕获的异常将进入[统一错误处理](#统一错误处理)。**

::: tip 提示
Handler初始化阶段通常会创建请求处理过程中需要的**静态资源**和**动态资源**，这些资源可以通过挂载至```this```的方式在整个Handler生命周期中共享。初始化阶段中创建的资源需要在[Handler析构](#handler析构)阶段释放，否则可能导致内存泄露。

- 动态资源：与用户请求相关的资源，比如：链路追踪器、日志输出器等。
- 静态资源：与用户请求无关的资源，比如：数据库操作实例、RPC通信实例等。
:::

ServiceCore发起Handler初始化指令通过执行```await initHandler()```。因此，如果需要异步操作时阻塞流程可以使用```Promise```实现。

::: danger 注意
初始化阶段通常不执行向用户返回处理结果的动作。若在此阶段需要向用户返回，通过操作用户返回实例```res```即可，向用户返回后将直接进入[Handler析构](#handler析构)阶段。
:::

样例代码中展示了同步/异步初始化操作：

::: danger 注意
重写```initHandler```时必须执行```super.initHandler()```，否则Handler将无法正常进入[Handler析构](#handler析构)阶段。
:::

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

  // 处理完成
  onFinish(data, req, res) {
    super.onFinish(data, req, res);
    this.logger.log('处理完成');
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## Handler中间件

**Handler中间件支持所有Express生态中间件，支持[动态中间件](/guide/dynamic-middleware)**。本节仅介绍Handler级别中间件的基础用法，[动态中间件](/guide/dynamic-middleware)将于高阶功能中介绍。**中间件执行过程中产生了未捕获的异常将进入[统一错误处理](#统一错误处理)。**

::: tip 提示
动态中间件包括：

- 处理每个用户请求时，根据实际请求情况动态生成中间件列表。
- 执行每个中间件时，根据实际请求情况或上一个中间件结果控制中间件执行行为，比如丢弃执行结果、跳过执行等。
:::

::: danger 注意
在Handler中间件阶段应尽量使用流程控制方法```next()```控制处理流程，而不是直接操作用户返回实例```res```。

- 执行```next(err)```：Handler流程控制将分发请求至[统一错误处理](#统一错误处理)。
- 执行```next(data)```：Handler流程控制将分发请求至[统一完成处理](#统一完成处理)。
- 执行```next('commit')```：**仅在中间件调用确认时支持使用**，Handler流程控制将执行当前中间件。
- 执行```next()```、```next(null)```或```next(undefined)```：Handler流程控制将发起下一个位置中间件的调用确认。在调用确认阶段进行此操作表示跳过当前中间件执行，直接发起下一个中间件的调用确认；在完成确认阶段进行此操作则认为确认完成，发起下一个中间件的调用确认。
:::

自定义Handler时，通过重写```getMiddlewares()```配置待执行的Handler中间件列表。Handler流程控制通过执行```await getMiddlewares()```获取待执行的中间件列表，因此可以通过```Promise```异步设置中间件列表。

样例代码中展示了同步/异步设置中间件列表：

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

Handler中间件阶段结束后（即：中间件列表最后一个中间件执行完成且被确认后），流程控制将分发用户请求进入预处理阶段继续处理。一些通用业务层逻辑（比如：请求参数解析与校验）可以在此阶段进行，通过重写```preHandler()```自定义请求预处理行为。

::: danger 注意
在预处理阶段即将结束时，应使用流程控制方法```next()```控制处理流程，而不是直接操作用户返回实例```res```。

- 执行```next()```：Handler流程控制将会根据用户请求方式，分发用户请求至对应的```Method Handler```执行[请求后处理](#请求后处理)。比如：用户请求方式为POST，Handler将调用```postHandler()```进行后处理。
- 执行```next(err)```：Handler流程控制将分发请求至[统一错误处理](#统一错误处理)。
- 执行```next(data)```：Handler流程控制将分发请求至[统一完成处理](#统一完成处理)。
:::

::: warning 注意

- 请求预处理默认行为：直接执行```next()```进入后处理阶段，即：在不重写```preHandler()```时，Handler中间件阶段结束后直接进入[请求后处理](#请求后处理)。
- 预处理阶段与中间件阶段的流程控制方法```next()```行为不同：执行```next(data)```时，后处理阶段中```data```可能为```null```或```undefined```，此时直接进入[统一完成处理](#统一完成处理)；而中间件阶段的流程控制方法入参为```null```或```undefined```表示执行下一个中间件。
:::

样例代码展示了在预处理阶段处理基础入参：

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

在Handler请求预处理阶段即将结束时，若通过流程控制方法```next()```决定进入后处理阶段，Handler流程控制将根据用户请求方式执行对应的```Method Handler```。比如：用户请求方式为POST，核心流程将调用```postHandler()```执行后续请求处理。用户请求对应的实际业务处理通常发生在此阶段，通过重写对应的```Method Handler```自定义请求后处理行为。

::: danger 注意
在后处理阶段即将结束时，应使用流程控制方法```next()```控制处理流程，而不是直接操作用户返回实例```res```。

- 执行```next(err)```：核心流程将分发请求至[统一错误处理](#统一错误处理)。
- 执行```next(data)```：核心流程将分发请求至[统一完成处理](#统一完成处理)。
:::

::: warning 注意

- 请求后处理默认行为：根据请求方式构造对应的```Method Handler```方法名，若```Method Handler```在Handler中被重写则发起调用；否则调用默认后处理方法```_defaultHandler()```。默认后处理方法将直接向用户返回404状态码。
- 后处理阶段、预处理阶段和中间件阶段的流程控制方法```next()```行为不同：在后处理阶段执行```next()```时，Handler将自动转换为```next(undefined)```，将分发请求至[统一完成处理](#统一完成处理)。
:::

样例代码中实现了使用GET方式请求```/Test.do```时返回query参数的业务：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // 实现GET请求处理逻辑
  getHandler(req, res, next) {
    next(req.query);
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## 统一完成处理

在Handler处理过程的任意阶段调用```next(data)```将进入统一完成处理。此阶段为请求处理的末端，通常需要操作用户返回实例```res```返回请求处理结果。通过重写```onFinish()```自定义统一完成处理行为。

::: danger 注意
仅使用流程控制方法```next(data)```才能进入统一完成处理。通过操作用户返回实例```res```导致处理结束将直接进入[Handler析构](#handler析构)，不会进入此阶段。
:::

::: warning 注意

- 在中间件阶段中，执行```next()```、```next(null)```或```next(undefined)```时，Handler流程控制将尝试发起中间件列表中的下一个中间件的调用确认而不是进入统一完成处理。
- 在预处理阶段中，执行```next()```时与中间件阶段表现相同；而执行```next(null)```或```next(undefied)```时与中间件阶段不同，此时Handler流程控制将进入统一完成处理。
- 在后处理阶段中，执行```next()```、```next(null)```或```next(undefined)```时，Handler流程控制将进入统一完成处理。
:::

默认行为下，统一完成处理使用```res.status(200).send()```向用户返回流程控制方法```next(data)```带入的```data```。

样例代码将以默认统一完成处理演示如何自定义统一完成处理行为：

```javascript
const Core = require('node-codejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // 统一完成处理
  onFinish(data, req, res) {
    res.status(200).send(data);
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

## 统一错误处理

在Handler处理过程中出现了未被捕获的异常或任意阶段调用了```next(err)```时将进入统一错误处理。此阶段为请求处理的末端，用于统一收口请求处理过程中产生的异常，通常需要直接操作用户返回实例```res```返回请求处理结果。通过重写```onError()```自定义异常处理行为。

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

## Handler析构

在Handler处理过程的任意阶段，用户返回实例```res```执行了返回行为时，则Handler处理结束，进入析构阶段。

::: danger 警告
Handler析构阶段执行时，用户返回实例```res```已向用户返回。因此，在此阶段中仅允许对用户请求实例```req```和用户返回实例```res```执行读操作；对```req```和```res```执行写操作或业务操作无实际意义。
:::

::: tip 提示
通常Handler析构阶段与[Handler初始化](#handler初始化)阶段的行为相互对应，在析构阶段中释放初始化阶段创建的资源。
:::

样例代码中实现了记录用户请求```/Test.do```的处理时间：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 设置请求路径
  static getRoutePath() {
    return '/Test.do';
  }

  // Handler初始化
  initHandler(serviceCore, req, res) {
    super.initHandler(serviceCore, req, res);
    this.logger = new Core.BaseLogger();
    this.startTime = new Date();
    this.logger.log('开始处理用户请求...');
  }

  // GET请求处理
  getHandler(req, res, next) {
    setTimeout(() => { next() }, 1000);
  }

  // Handler析构
  destroyHandler(req, res) {
    const duration = (new Date()) - this.startTime;
    this.logger.log(`用户[${req.method.toUpperCase()}]请求处理结束,用时:[${duration}]毫秒`);
  }
}

// 构建并启动ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```
