# 请求处理

## 介绍

**Handler用于根据请求路径对客户端请求进行针对性处理。**

在客户端请求经过全局拦截器、全局中间件阶段的处理后，**ServiceCore**将创建与请求路径对应的**Handler实例**，并分发处理流程进入Handler阶段。因此，**ServiceCore**是**Handler**运行的容器，负责流程控制和请求前置处理；在Handler阶段根据请求路径进行针对性处理。

**Handler**拥有独立的[中间件系统](#handler中间件)和[处理流程](#handler处理流程)。我们可以通过**自定义Handler**的方式定制请求处理细节，在本章中我们将讨论常用场景下如何**自定义Handler**。

在[Web服务](/guide/web-service.html#设置请求路径)一章中，我们已经知道**自定义Handler**至少需要：

- 实现一个继承自```Core.Handler```的类。
- **重写```getRoutePath()```静态方法**，指定请求路径规则。
- **重写```methodHandler()```实例方法**，拦截期望方式的请求进行处理。

本质上```Core.Handler```是一个包含了核心处理流程的**抽象类**，我们通过实现**抽象类**的方法定制请求处理流程的各个环节。

下面，我们将分类介绍```Core.Handler```中推荐被重写的方法：

--- 

### 请求路径

- ```static getRoutePath()```

  - **使用场景**：设置**Handler**的请求路径规则。处理客户端请求时，**ServiceCore**将根据请求路径创建进实际行业务处理的**Handler实例**。
  
  - **调用时机**：**ServiceCore**执行```bind()```时自动调用此方法获取**Handler**的请求路径规则。
  
  - **注意事项**：重写时无需执行```super```操作，使用```return```返回请求路径规则。
    
    ::: warning 注意
    **ServiceCore**在执行```bind()```时将调用此方法获取**Handler**设置的请求路径规则并进行校正，校正规则为：**请求路径不以```'/'```开头时，将自动附加```'/'```作为前缀**。因此，我们**自定义Handler**时配置的请求路径尽量以```'/'```开头。
    :::

---

### 生命周期

- ```initHandler(serviceCore, req, res)```

  - **使用场景**：指定**Handler**的初始化逻辑。

  - **调用时机**：在**ServiceCore**处理客户端请求时，创建**Handler实例**后将调用此方法执行[Handler初始化](#handler初始化)。

  - **注意事项**：重写时必须执行```super```操作。

  ::: tip 提示
  **ServiceCore调用```await initHandler()```触发Handler初始化**。因此，我们在处理**ServiceCore**等待初始化过程中异步行为完成再分发处理流程的场景时，可以通过使用```Promise```：

  ```javascript
  const Core = require('node-corejs');

  class Handler extends Core.Handler {
    initHandler(serviceCore, req, res) {
      // 执行super操作
      super.initHandler(serviceCore, req, res);
      // 异步行为使用Promise
      return new Promise((resolve) => {
        // ...
        // 需要分发处理流程时执行resolve()
        resolve();
      });
    }
  }
  ```
  
  :::

- ```destroyHandler(req, res)```

  - **使用场景**：指定**Handler**的析构逻辑。

  - **调用时机**：在**Handler**任意处理阶段，返回实例```res```向客户端返回了数据时会调用此方法触发[Handler析构](#handler析构)。

  - **注意事项**：重写时无需执行```super```操作。

  ::: danger 注意
  **```Core.Handler```内置的```initHandler()```会对客户端返回实例```res```的```end```方法进行HOOK以实现在Handler任意处理阶段向客户端返回数据时触发[Handler析构](#handler析构)**。因此，我们在重写```initHandler()```时一定要执行```super```操作，否则**Handler**可能无法正常析构。

  注：```res.send()```等操作最终会调用```res.end()```。
  :::

--- 

### 中间件系统

- ```getMiddlewares(req, res)```

  - **使用场景**：根据客户端请求情况动态指定[Handler中间件](#handler中间件)。

  - **调用时机**：在[Handler初始化](#handler初始化)完成后将进入**Handler中间件阶段**，此时调用此方法获取中间件列表。

  - **注意事项**：重写时无需执行```super```操作。

  ::: tip 提示
  **Handler进入中间件阶段后，将调用```await getMiddlewares()```获取中间件列表**。因此，我们可以使用```Promise```异步返回处理客户端请求需要的中间件。

  ```javascript
  const Core = require('node-corejs');

  class Handler extends Core.Handler {
    getMiddlewares(req, res) {
      // 使用Promise异步返回中间件列表
      return new Promise((resolve) => {
        /// ...
        // 通过resolve()返回中间件列表
        resolve([...]);
      });
    }
  }
  ```
  
  :::

- ```onWillExecMiddleware(middleware, req, res, next)```

  - **使用场景**：[Handler动态中间件](/guide/dynamic-middleware.html)的核心API，提供了在执行中间件前确认/跳过中间件执行的能力。

  - **调用时机**：**Handler中间件阶段**每次尝试分发中间件时，都将调用此方法确认执行当前将要分发的中间件。在此方法中使用流程控制函数```next```选择执行或跳过当前将要分发的中间件。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，每个中间件都将被确认执行。

- ```onDidExecMiddleware(middleware, middlewareResult, req, res, next)```

  - **使用场景**：[Handler动态中间件](/guide/dynamic-middleware.html)的核心API，提供了在中间件执行完成后临时处理执行结果的能力。

  - **调用时机**：**Handler中间件阶段**每个中间件执行完成后，都将调用此方法确认当前中间件执行完成。在此方法中根据当前请求处理情况使用流程控制函数```next```选择直接向客户端返回处理结果或尝试分发下一个中间件。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，将确认当前中间件执行完成直接分发下一个中间件。

::: tip 说明
**Handler动态中间件**是一个非常灵活并且有意思的系统，我们将在[动态中间件](/guide/dynamic-middleware.html)一章中进行详细讨论。在本章中，仅介绍Handler中间件的基础使用。
:::

---

### 请求处理

- ```preHandler(req, res, next)```

  - **使用场景**：根据**Handler中间件阶段**的处理结果进行[请求预处理](#请求预处理)，比如：客户端请求参数聚合、校验等。

  - **调用时机**：**Handler中间件阶段**将于最后一个中间件被确认执行完成后结束，此后进入**Handler请求处理阶段**。在**Handler请求处理阶段**中，首先调用此方法进行[请求预处理](#请求预处理)，根据预处理情况使用流程控制函数```next```选择直接向客户端返回处理结果或进行[请求后处理](#请求后处理)。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，将直接分发客户端请求进入[请求后处理](#请求后处理)。

- ```methodHandler(req, res, next)```

  - **使用场景**：执行客户端请求对应的业务处理逻辑，即[请求后处理](#请求后处理)。

  - **调用时机**：在**Handler请求处理阶段**的[请求预处理](#请求预处理)过程中执行```next()```时，**Handler**将尝试调用与客户端请求方式匹配的实例方法进入[请求后处理](#请求后处理)，根据实际业务处理结果使用流程控制函数```next```选择触发[统一完成处理](#统一完成处理)或[统一错误处理](#统一错误处理)。

  - **注意事项**：重写时无需执行```super```操作。如果在**Handler**中没有实现与客户端请求方式匹配的实例方法，将调用```defaultHandler()```执行默认后处理逻辑。

- ```defaultHandler(req, res, next)```

  - **使用场景**：对请求方式与预期不符时的客户端请求进行统一处理。

  - **调用时机**：在**Handler请求处理阶段**的[请求预处理](#请求预处理)过程中执行```next()```时，**Handler**将尝试调用与客户端请求方式匹配的实例方法进入[请求后处理](#请求后处理)。当**Handler**中没有实现与客户端请求方式匹配的实例方法时，将调用此方法触发默认的后处理逻辑。

  - **注意事项**：重写时无需执行```super```操作，默认直接调用```res.status(404).end()```向客户端返回404状态码。

::: tip 说明
在[请求预处理](#请求预处理)即将结束时，**Handler**将尝试调用方法名为```${req.method.toLowerCase()}Handler```的实例方法进入[请求后处理](#请求后处理)。

因此，我们在**自定义Handler**时根据请求方式实现对应的```methodHandler()```即可捕获对应类型的客户端请求。比如，我们实现```postHandler()```以对来自客户端的POST请求进行后处理。
:::

---

### 统一处理

- ```onFinish(data, req, res)```
- ```onError(error, req, res)```

## Handler处理流程

![Handler处理流程](/images/Handler处理流程.jpg)

## 流程控制函数

**ServiceCore**完成**Handler初始化**后，将调用**Handler**的内部方法```_onStart()```启动核心流程分发器。

::: danger 注意
**```_onStart()```中实现了Handler的核心流程控制逻辑。因此，我们在自定义Handler时，一定不要使用```_onStart```作为实例方法名。**
:::

---

在**中间件阶段**和**请求处理阶段**执行过程中，**Handler**提供了流程控制函数```next```控制处理流程。

**Handler的流程控制函数```next```在中间件阶段与Express中间件（ServiceCore使用的中间件系统）中的```next```拥有一致的使用体验：**

- 执行```next(err)```时，触发[统一错误处理](#统一错误处理)。
- 执行```next()```、```next(null)```、```next(undefined)```时，分发下一个中间件。

**同时，Handler的流程控制函数```next```拓展了动态中间件控制指令：**

- 在**任意处理阶段**，执行```next(data)```时，触发[统一完成处理](#统一完成处理)。
- 在**中间件阶段**确认中间件执行的HOOK函数```onWillExecMiddleware()```中执行```next('commit')```时，表示确认执行中间件。

::: tip 说明

- ```next(err)```：执行```next(value)```时，```value```为```Error```类型。
- ```next(data)```：执行```next(value)```时，```value```不为```Error```类型且不为**占位值**。

注：**占位值**表示**Handler**内置的特殊值，这些值将导致核心流程分发器派发指定的流程：

- 在**中间件阶段**确认中间件执行的HOOK函数```onWillExecMiddleware()```中，**占位值**为：```null```、```undefined```、```'commit'```。
- 在**中间件阶段**确认中间件执行完成的HOOK函数```onDidExecMiddleware()```中，**占位值**为：```null```、```undefined```。

:::

---

**Handler处理流程每个阶段中的流程控制函数```next```使用方式稍有不同：**

|                    | ```next()``` | ```next(null)``` | ```next(undefined)``` | ```next('commit')``` | ```next(err)``` | ```next(data)``` |
|:------------------ | :----------- | :--------------- | :-------------------- | :------------------- | :-------------- | :--------------- | 
| 中间件阶段 - 执行确认 | 跳过执行，分发下一个中间件 | 跳过执行，分发下一个中间件 | 跳过执行，分发下一个中间件 | 确认执行中间件 | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 中间件阶段 - 执行过程 | 分发下一个中间件 | 分发下一个中间件 | 分发下一个中间件 | 触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 中间件阶段 - 完成确认 | 分发下一个中间件 | 分发下一个中间件 | 分发下一个中间件 | 触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 请求处理阶段 - 预处理 | 分发下一个中间件 |  触发[统一完成处理](#统一完成处理) |  触发[统一完成处理](#统一完成处理) |  触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 请求处理阶段 - 后处理 | 触发[统一完成处理](#统一完成处理) | 触发[统一完成处理](#统一完成处理) |  触发[统一完成处理](#统一完成处理) |  触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |

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
