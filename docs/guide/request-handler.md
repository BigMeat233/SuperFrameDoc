# 请求处理

## 介绍

**Handler用于根据请求路径对客户端请求进行针对性处理。**

在客户端请求经过全局拦截器、全局中间件阶段的处理后，**ServiceCore**将创建与请求路径对应的**Handler实例**，并分发处理流程进入**Handler阶段**。因此，**ServiceCore**是**Handler**运行的容器，负责流程控制和请求前置处理；在**Handler阶段**根据请求路径进行针对性处理。

**Handler**拥有独立的[中间件系统](#中间件系统-2)和[处理流程](#处理流程)。我们可以通过**自定义Handler**的方式定制请求处理细节，在本章中我们将讨论常用场景下如何**自定义Handler**。

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

  - **使用场景**：根据客户端请求情况动态指定[Handler中间件](#中间件系统-2)。

  - **调用时机**：在[Handler初始化](#handler初始化)完成后将进入**Handler中间件阶段**，此时调用此方法获取中间件列表。

  - **注意事项**：重写时无需执行```super```操作。
  
- ```onWillExecMiddleware(middleware, req, res, next)```

  - **使用场景**：[Handler动态中间件](/guide/dynamic-middleware.html)的核心API，提供了在执行中间件前确认/跳过中间件执行的能力。

  - **调用时机**：**Handler中间件阶段**每次尝试分发中间件时，都将调用此方法发起对当前将要分发的中间件执行确认。在此方法中使用流程控制函数```next```选择执行或跳过当前将要分发的中间件。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，每个中间件都将被确认执行。

- ```onDidExecMiddleware(middleware, middlewareResult, req, res, next)```

  - **使用场景**：[Handler动态中间件](/guide/dynamic-middleware.html)的核心API，提供了在中间件执行完成后临时处理执行结果的能力。

  - **调用时机**：**Handler中间件阶段**每个中间件执行完成后，都将调用此方法确认当前中间件执行完成。在此方法中根据当前请求处理情况使用流程控制函数```next```选择直接向客户端返回处理结果或尝试分发下一个中间件。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，将确认当前中间件执行完成直接分发下一个中间件。

::: tip 说明
**Handler动态中间件**是一个非常灵活并且有意思的系统，我们将在[动态中间件](/guide/dynamic-middleware.html)一章中进行详细讨论。在本章中，仅介绍[中间件系统](#中间件系统-2)的基础使用。
:::

---

### 请求处理

- ```preHandler(req, res, next)```

  - **使用场景**：根据**Handler中间件阶段**的处理结果进行[请求预处理](#请求预处理)，比如：客户端请求参数聚合、校验等。

  - **调用时机**：**Handler中间件阶段**将于最后一个中间件执行完成被确认后结束，此后进入**Handler请求处理阶段**。在**Handler请求处理阶段**中，首先调用此方法进行[请求预处理](#请求预处理)，根据预处理情况使用流程控制函数```next```选择直接向客户端返回处理结果或进行[请求后处理](#请求后处理)。

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

  - **使用场景**：对客户端请求处理完成后的业务逻辑进行[统一处理](#统一完成处理)，比如：向客户端返回处理结果。

  - **调用时机**：在**Handler**任意处理阶段使用流程控制函数执行```next(data)```时将认为请求处理完成，调用此方法进行完成处理。

  - **注意事项**：重写时无需执行```super```操作，默认直接调用```res.status(200).send(data)```向客户端返回200状态码和流程控制函数```next```带入的数据。

- ```onError(error, req, res)```

  - **使用场景**：对客户端请求处理过程中产生的异常进行[统一处理](#统一错误处理)。

  - **调用时机**：**Handler**任意处理阶段中产生了未被捕获的异常或使用流程控制函数执行```next(err)```时，将调用此方法进行错误处理。

  - **注意事项**：重写时无需执行```super```操作，默认直接调用```res.status(500).end()```向客户端返回500状态码。

::: tip 提示
出于降低逻辑复杂度考虑，我们在**自定义Handler**时尽量仅在[统一完成处理](#统一完成处理)和[统一错误处理](#统一错误处理)时**操作客户端返回实例```res```向客户端应答处理结果**。在客户端请求处理过程中，使用```next(data)```或```next(err)```使处理流程闭环。
:::

## 处理流程

![Handler处理流程](/images/Handler处理流程.jpg)

## 流程控制函数

**ServiceCore**完成**Handler初始化**后，将调用**Handler**的内部方法```_onStart()```启动核心流程分发器。

::: danger 注意
**```_onStart()```中实现了Handler的核心流程控制逻辑。因此，我们在自定义Handler时，一定不要使用```_onStart```作为实例方法名。**
:::

---

在**中间件阶段**和**请求处理阶段**执行过程中，**Handler**提供了流程控制函数```next```控制请求处理流程。

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

在[Web服务](/guide/web-service.html#设置请求路径)一章中，我们已经通过重写```static getRoutePath()```实现了设置**Handler**的请求路径。

接下来我们将讨论在**设置请求路径**时的注意事项：

- **请求路径**为非空字符串。
  > **ServiceCore**绑定**Handler**时将校验请求路径的有效性，如果请求路径无效将拒绝绑定。

- **请求路径**使用```'/'```开头。
  > 请求路径不以```'/'```开头时，**ServiceCore**将自动附加```'/'```作为前缀。

::: tip 说明
没有重写```static getRoutePath()```的**自定义Handler**将在客户端请求```'/'```（根路径）时被命中。
:::

## 初始化和析构

**Handler**的初始化和析构标志着**Handler**生命周期的开始和结束：

- 客户端请求处理进入**Handler阶段**后，**ServiceCore**将创建与请求路径对应的**Handler实例**并发起[Handler初始化](#handler初始化)。
- 在**Handler**任意处理阶段，返回实例```res```向客户端返回了数据时将触发[Handler析构](#handler析构)。至此，**Handler**生命周期结束。

::: tip 提示
通常，[Handler初始化](#handler初始化)与[Handler析构](#handler析构)时执行相反的资源操作，否则可能导致内存泄露。
:::

### Handler初始化

在**自定义Handler**时，通过重写实例方法```initHandler()```定制**Handler**的初始化行为。

通常，我们在**Handler初始化**时根据客户端请求情况创建处理过程中使用的资源，并将这些资源提升为实例属性在整个**Handler生命周期**中共享：

::: danger 注意
重写```initHandler()```时必须执行```super```操作，否则**Handler**无法正常进入[Handler析构](#handler析构)。
:::

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  initHandler(serviceCore, req, res) {
    // 执行super操作
    super.initHandler(serviceCore, req, res);
    // 创建一个在整个生命周期中共享的基础输出器
    this.logger = new Core.BaseLogger();
  }
}

```

**ServiceCore通过调用```await initHandler()```触发Handler初始化**。因此，我们可以使用```Promise```处理**ServiceCore**等待初始化过程中异步操作完成再分发处理流程的场景：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  initHandler(serviceCore, req, res) {
    // 执行super操作
    super.initHandler(serviceCore, req, res);
    // 需要ServiceCore等待异步行为时使用Promise
    return new Promise((resolve) => {
      // ...
      // 异步操作结束后执行resolve()
      resolve();
    });
  }
}
```

### Handler析构

在**自定义Handler**时，通过重写实例方法```destroyHandler()```定制**Handler**的析构行为。

需要注意的是，**Handler进入析构阶段时，返回实例```res```已向客户端返回处理结果**。因此，我们在**Handler析构**中对请求实例```req```和返回实例```res```的操作应仅保留读取行为。

---

我们可以通过计算客户端请求进入**Handler初始化**阶段和**Handler析构**阶段的时间差得到处理耗时：

```javascript
const Core = require('node-corejs');

// 自定义Handler
class Handler extends Core.Handler {
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

## 中间件系统

**Handler的中间件系统支持动态中间件且兼容Express生态。**

::: tip 说明

**动态中间件**指的是根据当前上处理情况动态执行中间件的能力：

- **动态中间件列表**，即：根据每次客户端请求情况动态生成应用于处理链路的中间件列表。
- **中间件链路控制**，即：中间件列表中的每个中间件分发/执行完成时，根据当前处理上下文控制中间件执行行为，比如跳过执行、丢弃执行结果等。

:::

在**自定义Handler**时，我们通过重写实例方法```getMiddlewares()```设置处理客户端请求时使用的中间件列表：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  getMiddlewares(req, res) {
    // 根据客户端请求动态返回中间件列表
    return [...];
  }
}
```

当客户端请求处理流程进入**Handler中间件阶段**时，将调用```await getMiddlewares()```获取处理此次请求使用的中间件列表。因此，我们可以使用```Promise```处理异步构造中间件列表的场景：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  getMiddlewares(req, res) {
    // 需要异步构建中间件列表时使用Promise
    return new Promise((resolve) => {
      // ...
      // 异步操作结束后执行resolve()
      resolve([...]);
    });
  }
}
```

中间件列表中每个中间件的调用将遵循：执行确认 -> 实际执行 -> 完成确认。我们应尽可能的使用[流程控制函数](#流程控制函数)```next```控制处理流程，而不是直接操作返回实例```res```。

--- 

### 中间件执行确认

**Handler中间件系统**分发中间件时，首先调用实例方法```onWillExecMiddleware()```发起**中间件执行确认**。我们可以根据客户端请求参数、当前将要执行的中间件等上下文信息选择：

- 确认执行当前分发的中间件。
- 跳过此中间件执行，分发下一个中间件。

在**中间件执行确认**阶段，我们可以使用：

- 执行```next(err)```：触发[统一错误处理](#统一错误处理)。
- 执行```next(data)```：触发[统一完成处理](#统一完成处理)。
- 执行```next('commit')```：确认执行当前分发的中间件，进入实际执行阶段。中间件执行完成后将发起[中间件完成确认](#中间件完成确认)。
- 执行```next()```、```next(null)```、```next(undefined)```：跳过当前将要分发的中间件的实际执行和完成确认阶段，直接发起下一个中间件的执行确认。

如果在**自定义Handler**时没有重写```onWillExecMiddleware()```，**Handler中间件系统**在执行确认阶段将自动执行```next('commit')```。因此，所有中间件都将进入实际执行阶段。

---

### 中间件完成确认

**Handler中间件系统**将在中间件实际执行完成后，调用```onDidExecMiddleware()```发起**中间件完成确认**。我们可以根据客户端请求参数、当前执行完成的中间件、执行结果等上下文信息选择：

- 分发下一个中间件。
- 直接向客户端返回处理结果。

在**中间件完成确认**阶段，我们可以使用：

- 执行```next(err)```：触发[统一错误处理](#统一错误处理)。
- 执行```next(data)```：触发[统一完成处理](#统一完成处理)。
- 执行```next()```、```next(null)```、```next(undefined)```：发起下一个中间件的执行确认。

::: tip 提示
在```onDidExecMiddleware()```中执行```next('commit')```将触发[统一完成处理](#统一完成处理)，此时```data```为```'commit'```。
:::

如果在**自定义Handler**时没有重写```onDidExecMiddleware()```，**Handler中间件系统**在完成确认阶段将自动执行```next()```直接分发下一个中间件。

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
