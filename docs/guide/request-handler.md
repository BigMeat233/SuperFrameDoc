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

- ```initHandler(req, res)```

  - **使用场景**：指定**Handler**的初始化逻辑。

  - **调用时机**：在**ServiceCore**处理客户端请求时，创建**Handler实例**后将调用此方法执行[Handler初始化](#handler初始化)。

  - **注意事项**：重写时无需执行```super```操作。

- ```destroyHandler(req, res)```

  - **使用场景**：指定**Handler**的析构逻辑。

  - **调用时机**：在**Handler**任意处理阶段，返回实例```res```向客户端返回了数据时会调用此方法触发[Handler析构](#handler析构)。

  - **注意事项**：重写时无需执行```super```操作。

--- 

### 中间件系统

- ```getMiddlewares(req, res)```

  - **使用场景**：根据客户端请求情况动态指定[Handler中间件](#中间件系统-2)。

  - **调用时机**：在[Handler初始化](#handler初始化)完成后将进入**Handler中间件阶段**，此时调用此方法获取中间件列表。

  - **注意事项**：重写时无需执行```super```操作。
  
- ```onWillExecMiddleware(middleware, req, res, next)```

  - **使用场景**：[Handler动态中间件](/guide/dynamic-middleware.html)的核心API，提供了在执行中间件前确认/跳过中间件执行的能力。

  - **调用时机**：**Handler中间件阶段**每次尝试分发中间件时，都将调用此方法发起对当前将要分发的中间件执行确认。在此方法中使用[流程控制函数](#流程控制函数)```next```选择执行或跳过当前将要分发的中间件。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，每个中间件都将被确认执行。

- ```onDidExecMiddleware(middleware, middlewareResult, req, res, next)```

  - **使用场景**：[Handler动态中间件](/guide/dynamic-middleware.html)的核心API，提供了在中间件执行完成后临时处理执行结果的能力。

  - **调用时机**：**Handler中间件阶段**每个中间件执行完成后，都将调用此方法确认当前中间件执行完成。在此方法中根据当前请求处理情况使用[流程控制函数](#流程控制函数)```next```选择直接向客户端返回处理结果或尝试分发下一个中间件。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，将确认当前中间件执行完成直接分发下一个中间件。

::: tip 说明
**Handler动态中间件**是一个非常灵活并且有意思的系统，我们将在[动态中间件](/guide/dynamic-middleware.html)一章中进行详细讨论。在本章中，仅介绍[中间件系统](#中间件系统-2)的基础使用。
:::

---

### 请求处理

- ```preHandler(req, res, next)```

  - **使用场景**：根据**Handler中间件阶段**的处理结果进行[请求预处理](#请求预处理)，比如：客户端请求参数聚合、校验等。

  - **调用时机**：**Handler中间件阶段**将于最后一个中间件执行完成被确认后结束，此后进入**Handler请求处理阶段**。在**Handler请求处理阶段**中，首先调用此方法进行[请求预处理](#请求预处理)，根据预处理情况使用[流程控制函数](#流程控制函数)```next```选择直接向客户端返回处理结果或进行[请求后处理](#请求后处理)。

  - **注意事项**：重写时无需执行```super```操作。未重写此方法时，将直接分发客户端请求进入[请求后处理](#请求后处理)。

- ```methodHandler(req, res, next)```

  - **使用场景**：执行客户端请求对应的业务处理逻辑，即[请求后处理](#请求后处理)。

  - **调用时机**：在**Handler请求处理阶段**的[请求预处理](#请求预处理)过程中执行```next()```时，**Handler**将尝试调用与客户端请求方式匹配的实例方法进入[请求后处理](#请求后处理)，根据实际业务处理结果使用[流程控制函数](#流程控制函数)```next```选择触发[统一完成处理](#统一完成处理)或[统一错误处理](#统一错误处理)。

  - **注意事项**：重写时无需执行```super```操作。如果在**Handler**中没有实现与客户端请求方式匹配的实例方法，将调用```defaultHandler()```执行默认后处理逻辑。

- ```defaultHandler(req, res, next)```

  - **使用场景**：对请求方式与预期不符时的客户端请求进行统一处理。

  - **调用时机**：在**Handler请求处理阶段**的[请求预处理](#请求预处理)过程中执行```next()```时，**Handler**将尝试调用与客户端请求方式匹配的实例方法进入[请求后处理](#请求后处理)。当**Handler**中没有实现与客户端请求方式匹配的实例方法时，将调用此方法触发默认的后处理逻辑。

  - **注意事项**：重写时无需执行```super```操作，默认直接调用```res.status(404).end()```向客户端返回404状态码。

::: tip 说明
在[请求预处理](#请求预处理)即将结束时，**Handler**将尝试调用方法名为```${req.method.toLowerCase()}Handler```的实例方法进入[请求后处理](#请求后处理)。

因此，我们在**自定义Handler**时根据请求方式实现对应的```methodHandler()```即可指定对应类型的客户端请求的后处理逻辑。比如，我们实现实例方法```postHandler()```以对来自客户端的POST请求进行后处理。
:::

---

### 统一处理

- ```onFinish(data, req, res)```

  - **使用场景**：对客户端请求处理完成后的业务逻辑进行[统一处理](#统一完成处理)，比如：向客户端返回处理结果。

  - **调用时机**：在**Handler**任意处理阶段使用[流程控制函数](#流程控制函数)执行```next(data)```时将认为请求处理完成，调用此方法进行完成处理。

  - **注意事项**：重写时无需执行```super```操作，默认直接调用```res.status(200).send(data)```向客户端返回200状态码和[流程控制函数](#流程控制函数)```next```带入的数据。

- ```onError(error, req, res)```

  - **使用场景**：对客户端请求处理过程中产生的异常进行[统一处理](#统一错误处理)。

  - **调用时机**：**Handler**任意处理阶段中产生了未被捕获的异常或使用[流程控制函数](#流程控制函数)执行```next(err)```时，将调用此方法进行错误处理。

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

在**中间件阶段**和**请求处理阶段**执行过程中，**Handler**提供了**流程控制函数**控制请求处理流程。

**Handler中的```next```在中间件阶段与Express中间件（ServiceCore使用的中间件系统）中的```next```拥有一致的使用体验：**

- 执行```next(err)```时，触发[统一错误处理](#统一错误处理)。
- 执行```next()```、```next(null)```、```next(undefined)```时，分发下一个中间件。

**同时，Handler中的```next```拓展了动态中间件控制指令：**

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

**Handler处理流程每个阶段中的```next```使用方式稍有不同：**

|                    | ```next()``` | ```next(null)``` | ```next(undefined)``` | ```next('commit')``` | ```next(err)``` | ```next(data)``` |
|:------------------ | :----------- | :--------------- | :-------------------- | :------------------- | :-------------- | :--------------- | 
| 中间件阶段 - 执行确认 | 跳过执行，分发下一个中间件 | 跳过执行，分发下一个中间件 | 跳过执行，分发下一个中间件 | 确认执行中间件 | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 中间件阶段 - 执行过程 | 分发下一个中间件 | 分发下一个中间件 | 分发下一个中间件 | 触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 中间件阶段 - 完成确认 | 分发下一个中间件 | 分发下一个中间件 | 分发下一个中间件 | 触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
| 请求处理阶段 - 预处理 | 触发[请求后处理](#请求后处理) |  触发[统一完成处理](#统一完成处理) |  触发[统一完成处理](#统一完成处理) |  触发[统一完成处理](#统一完成处理) | 触发[统一错误处理](#统一错误处理) | 触发[统一完成处理](#统一完成处理) |
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

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  initHandler(req, res) {
    // 创建一个在整个生命周期中共享的基础输出器
    this.logger = new Core.BaseLogger();
  }
}

```

**ServiceCore通过调用```await initHandler()```触发Handler初始化**。因此，我们可以使用```Promise```处理**ServiceCore**等待初始化过程中异步操作完成再分发处理流程的场景：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  initHandler(req, res) {
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
  initHandler(req, res) {
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

**Handler中间件阶段**结束后将进入**Handler请求处理**阶段进行实际业务处理，而**请求预处理**是**Handler请求处理**的首个处理环节。

::: tip 说明
当中间件列表的最后一个中间件发生以下行为时将**Handler中间件阶段**结束：

- 在**中间件执行确认**时被跳过执行。
- 在**中间件完成确认**时被确认完成。
:::

在**自定义Handler**时，通过重写实例方法```preHandler()```定制**请求预处理**环节的处理逻辑。通常，我们在**请求预处理**中完成对来自客户端上送参数的基础处理。

::: tip 提示
实现**请求预处理**逻辑时，我们同样应尽可能的使用[流程控制函数](#流程控制函数)```next```控制处理流程，而不是直接操作返回实例```res```。

- 执行```next()```：触发[请求后处理](#请求后处理)。
- 执行```next(err)```：触发[统一错误处理](#统一错误处理)。
- 执行```next(data)```：触发[统一完成处理](#统一完成处理)。
:::

让我们来看一个聚合客户端请求中的```query```和```body```的**请求预处理**实现：

```javascript
const Core = require('node-corejs');
const bodyParser = require('body-parser');

const jsonParserMiddleware = bodyParser.json({ limit: 2 * 1024 * 1024 });
const qsParserMiddleware = bodyParser.urlencoded({ limit: 2 * 1024 * 1024, extended: true });

class Handler extends Core.Handler {
  preHandler(req, res, next) {
    const body = req.body;
    const query = req.query;
    req.requestParams = Object.assign({}, body, query);
    next();
  }
}

// 使用body-parser作为全局中间件解析body参数
const serviceCore = new Core.ServiceCore({
  middlewares: [jsonParserMiddleware, qsParserMiddleware]
});
serviceCore.bind([Handler]);
serviceCore.start();

```

如果在**自定义Handler**时没有重写```preHandler()```，**Handler**在**请求预处理**中自动执行```next()```进入[请求后处理](#请求后处理)。

## 请求后处理

在**请求预处理**环节使用[流程控制函数](#流程控制函数)执行```next()```时，**Handler**将尝试调用方法名为```${req.method.toLowerCase()}Handler```的实例方法进入**请求后处理**。

因此，我们在**自定义Handler**时根据请求方式实现对应的```methodHandler()```即可指定对应类型的客户端请求的后处理逻辑。比如，我们实现实例方法```postHandler()```以对来自客户端的POST请求进行后处理。

::: tip 说明
同样，我们应尽可能在**请求后处理**中使用[流程控制函数](#流程控制函数)```next```控制处理流程，而不是直接操作返回实例```res```。

- 执行```next(err)```：触发[统一错误处理](#统一错误处理)。
- 执行```next(data)```：触发[统一完成处理](#统一完成处理)。

需要注意的是，在**请求后处理**中执行```next()```时，将认为```data```为```undefined```触发[统一完成处理](#统一完成处理)。
:::

让我们在**请求预处理**样例的基础上，添加**请求后处理**逻辑将参数的聚合结果向客户端返回：

```javascript {16,17,18,19}
const Core = require('node-corejs');
const bodyParser = require('body-parser');

const jsonParserMiddleware = bodyParser.json({ limit: 2 * 1024 * 1024 });
const qsParserMiddleware = bodyParser.urlencoded({ limit: 2 * 1024 * 1024, extended: true });

class Handler extends Core.Handler {
  // 请求预处理 - 聚合query和body
  preHandler(req, res, next) {
    const body = req.body;
    const query = req.query;
    req.requestParams = Object.assign({}, body, query);
    next();
  }

  // 请求后处理 - 向客户端返回参数聚合结果
  postHandler(req, res, next) {
    next(req.requestParams);
  }
}

// 使用body-parser作为全局中间件解析body参数
const serviceCore = new Core.ServiceCore({
  middlewares: [jsonParserMiddleware, qsParserMiddleware]
});
serviceCore.bind([Handler]);
serviceCore.start();

```

---

**Handler**进入**请求后处理**时没有检测到与客户端请求方式对应的实例方法时，将调用```defaultHandler()```执行默认的后处理逻辑，即```res.status(404).end()```。

因此，我们可以重写实例方法```defaultHandler()```统一处理无效的客户端请求：

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 向客户端返回404状态码和提示文字
  defaultHandler(req, res, next) {
    res.status(404).send('404 NOT FOUND');
  }
}

```

## 统一完成处理

**Handler引入统一完成处理是为了提取向客户端返回请求处理结果逻辑**。因此，我们在**Handler**任意请求处理阶段期望向客户端返回处理结果时应该执行```next(data)```而不是操作返回实例```res```。

::: tip 说明
通过操作返回实例```res```向客户端返回处理结果将直接触发[Handler析构](#handler析构)，不会进入**统一完成处理**。
:::

[流程控制函数](#流程控制函数)执行```next(data)```表示请求处理完成，期望向客户端返回处理结果。此时，**Handler**将使用```next(data)```中的```data```调用实例方法```onFinish()```进行完成处理。

我们可以通过重写实例方法```onFinish()```自定义**统一完成处理**逻辑。通常，在```onFinish()```中根据传入的```data```构建期望返回给客户端的内容，并操作返回实例```res```向客户端返回。

---

在```Core.Handler```中已经实现了默认的```onFinish()```。因此，如果在**自定义Handler**时没有修改**统一完成处理**的默认行为，则**Handler**向客户端返回200状态码和```data```。

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 默认的完成处理
  onFinish(data, req, res) {
    res.status(200).send(data);
  }
}
```

## 统一错误处理

**Handler**引入**统一错误处理**对请求处理过程中产生的异常进行收口。当出现以下行为时，将触发**统一错误处理**：

- **任意处理阶段**的同步逻辑中产生了未被捕获的异常。
- **任意处理阶段**中使用[流程控制函数](#流程控制函数)执行了```next(err)```。

::: warning 注意
考虑到大多数发生在异步操作中的异常并不会影响应用程序的正常执行，**Handler**在实现错误捕获时：

- 对于处理过程中产生的同步异常：对核心流程使用```try { ... } catch { ... }```自动捕获。
- 对于处理过程中产生的异步异常：在[流程控制函数](#流程控制函数)中提供```next(err)```手动捕获。

:::

我们可以通过重写实例方法```onError()```自定义**统一错误处理**逻辑。与**统一完成处理**类似，在```onError()```中通常根据传入的```err```构建期望返回给客户端的内容，并操作返回实例```res```向客户端返回。

---

在```Core.Handler```中已经实现了默认的```onError()```。因此，如果在**自定义Handler**时没有修改**统一错误处理**的默认行为，则**Handler**向客户端返回500状态码。

```javascript
const Core = require('node-corejs');

class Handler extends Core.Handler {
  // 默认的错误处理
  onError(err, req, res) {
    res.status(500).end();
  }
}
```
