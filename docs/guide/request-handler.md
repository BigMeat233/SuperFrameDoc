# 请求处理

## 介绍

**Handler用于根据客户端请求路径进行针对性处理。**

客户端请求进入**ServiceCore**后，将先后经过[全局拦截器](/guide/web-service.html#全局拦截器)和[全局中间件管道](/guide/web-service.html#全局中间件)。当**全局中间件管道**中的最后一个中间件执行完成后，**ServiceCore**将自动创建与请求路径匹配的**Handler实例**并引导请求进入其中进行后续处理。

::: tip 提示
**Handler**拥有独立于**ServiceCore**的[中间件系统](#中间件系统-2)。因此，我们在**Handler**维度指定的中间件只作用于符合请求路径规则的客户端请求。

另外，**Handler的中间件系统兼容Express生态且支持动态中间件**，我们可以根据客户端请求的实际上下文（比如：请求参数）：

- **动态指定中间件列表**
- **控制中间件执行规则**（比如：跳过执行）
:::

在[Web服务-设置请求路径](/guide/web-service.html#设置请求路径)一章中我们已经了解到，**自定义Handler**需要实现一个继承自```Core.Handler```的类。本质上```Core.Handler```是一个包含了核心处理流程的**抽象类**，我们通过实现**抽象类**内的HOOK方法以定制请求处理流程的各个环节。

**下面，我们将分类介绍```Core.Handler```中推荐被重写的方法：**

### 请求路径

- **```static getRoutePath()```**

  - **使用场景**：设置**Handler**的请求路径规则。**ServiceCore**处理客户端请求时，将根据请求路径指定完成实际处理动作的**Handler实例**。
  
  - **调用时机**：**ServiceCore**执行实例方法```bind()```时调用此方法获取**Handler**的请求路径规则。
  
  - **注意事项**：重写时无需执行```super```操作，使用```return```返回请求路径规则。
    
    ::: warning 注意
    **ServiceCore**将自动校正**Handler**的请求路径规则：**当请求路径规则不以```'/'```开头时，附加```'/'```作为前缀**。
    
    因此，我们配置请求路径规则时应尽量以```'/'```开头。
    :::
  
  - **默认行为**：设置请求路径规则为```'/'```。
    
    ```javascript
    static getRoutePath() {
      return '/';
    }
    ```

### 生命周期

- **```initHandler(req, res, next)```**

  - **使用场景**：指定[Handler初始化](#handler初始化)逻辑。

    ::: tip 提示
    此方法中通常执行的是**非业务相关的通用逻辑**（比如：创建**日志输出器**），对于**业务相关的初始化逻辑**推荐放入[请求预处理](#请求预处理)或[请求后处理](#请求后处理)阶段。
    :::

  - **调用时机**：**ServiceCore**处理每个客户端请求时，都将创建与请求路径匹配的**Handler实例**并调用此方法触发[Handler初始化](#handler初始化)。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。

    ::: tip 提示
    我们在实现[Handler初始化](#handler初始化)逻辑时，通常不直接操作**客户端返回实例```res```**，而是通过[流程控制函数](#流程控制函数)控制请求处理链路。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::

  - **默认行为**：直接调用[流程控制函数](#流程控制函数)进入下一处理阶段。
    
    ```javascript
    initHandler(req, res, next) {
      next();
    }
    ```

- **```destroyHandler(req, res)```**

  - **使用场景**：指定[Handler析构](#handler析构)逻辑。

  - **调用时机**：进入**Handler**处理的客户端请求返回时将调用此方法触发[Handler析构](#handler析构)。
    
    ::: tip 提示
    **如果客户端请求在ServiceCore的[全局拦截器](/guide/web-service.html#全局拦截器)和[全局中间件管道](/guide/web-service.html#全局中间件)阶段返回则不会触发[Handler析构](#handler析构)。**
    :::

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。

    ::: tip 提示
    进入[Handler析构](#handler析构)阶段时，客户端请求已返回处理结果。因此，我们应仅对**客户端请求实例**```req```和**客户端返回实例**```res```发起读取动作。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::

### 中间件系统

- **```getMiddlewares(req, res)```**

  - **使用场景**：根据客户端请求的实际上下文（比如：请求参数）动态指定[Handler中间件](#中间件系统-2)列表。

  - **调用时机**：在[Handler初始化](#handler初始化)完成后将进入**中间件阶段**，在开始分发**Handler中间件**前将调用此方法获取**中间件列表**。

  - **注意事项**：重写时无需执行```super```操作，使用```return```返回**中间件列表**即可；当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。
  
    ::: tip 提示
    我们在指定**Handler**的**中间件列表**时，通常不直接操作**客户端返回实例```res```**。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::
  
  - **默认行为**：返回```[]```。
    
    ```javascript
    getMiddlewares(req, res) {
      return [];
    }
    ```

- **```onInterceptMiddleware(middleware, req, res, next)```**

  - **使用场景**：**动态中间件**的核心HOOK方法，提供了**在分发中间件时控制其执行行为**的能力。

  - **调用时机**：**中间件阶段**分发每个中间件时，都将调用此方法完成中间件的实际执行行为。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。
  
    ::: tip 提示
    我们在实现**动态中间件**时，通常不直接操作**客户端返回实例```res```**，而是通过[流程控制函数](#流程控制函数)控制中间件的执行链路。

    在**中间件拦截**阶段，我们可以根据**当前分发中间件**```middleware.type```的类型，决定是否调用**中间件的执行函数**```middleware.exec```以实现对中间件执行行为的动态控制。
    :::

  - **默认行为**：执行中间件并将其结果作为执行[流程控制函数](#流程控制函数)的参数。
  
    ```javascript
    onInterceptMiddleware(middleware, req, res, next) {
      const { exec } = middleware;
      exec((result) => next(result));
    }
    ```

### 请求处理

- **```preHandler(req, res, next)```**

  - **使用场景**：根据中间件执行结果初始化处理客户端请求所需的基础环境，比如：参数聚合、创建基础资源等。

  - **调用时机**：在**中间件阶段**完成后（即：最后一个中间件的拦截阶段结束时），将调用此方法触发[请求预处理](#请求预处理)。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。

    ::: tip 提示
    我们在指定[请求预处理](#请求预处理)逻辑时，通常不直接操作**客户端返回实例```res```**，而是通过[流程控制函数](#流程控制函数)控制请求处理链路。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::

  - **默认行为**：直接调用[流程控制函数](#流程控制函数)进入下一处理阶段。
    
    ```javascript
    preHandler(req, res, next) {
      next();
    }
    ```

- **```[METHOD]Handler(req, res, next)```**

  - **使用场景**：根据客户端请求方式触发对应的业务处理逻辑。

  - **调用时机**：当[请求预处理](#请求预处理)阶段结束时，将调用与客户端请求方式匹配的实例方法以进入[请求后处理](#请求后处理)。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。

    ::: tip 提示
    **```[METHOD]Handler```不是在指定[请求后处理](#请求后处理)逻辑时实际重写的方法名**，只是**Handler Method**的代称，比如：处理客户端POST请求，我们应该重写**Handler**中的**实例方法```postHandler()```**。

    我们在指定[请求后处理](#请求后处理)逻辑时，通常不直接操作**客户端返回实例```res```**，而是通过[流程控制函数](#流程控制函数)控制请求处理链路。

    如果在**Handler**中没有实现与客户端请求方式匹配的**实例方法**，此时将调用```defaultHandler()```执行默认后处理逻辑。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::


- **```defaultHandler(req, res, next)```**

  - **使用场景**：对请求方式不符合预期的客户端请求进行统一处理。

  - **调用时机**：当[请求预处理](#请求预处理)结束时，如果**Handler**中没有实现与客户端请求方式匹配的实例方法时，将调用此方法触发默认的[请求后处理](#请求后处理)。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。

    ::: tip 提示
    我们在指定默认的[请求后处理](#请求后处理)逻辑时，通常不直接操作**客户端返回实例```res```**，而是通过[流程控制函数](#流程控制函数)控制请求处理链路。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::
  
  - **默认行为**：直接调用[流程控制函数](#流程控制函数)触发[统一完成处理](#统一完成处理)向客户端返回404状态码。
    
    ```javascript
    defaultHandler(req, res, next) {
      next(404);
    }
    ```

### 统一处理

- **```onFinish(data, req, res)```**

  - **使用场景**：对客户端请求处理完成后的逻辑进行统一处理。

  - **调用时机**：在任意请求处理阶段使用[流程控制函数](#流程控制函数)执行```next(data)```时将调用此方法触发[统一完成处理](#统一完成处理)。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发[统一错误处理](#统一错误处理)。
    
    ::: tip 提示
    我们在指定[统一完成处理](#统一完成处理)逻辑时，通常应直接操作**客户端返回实例```res```**，向客户端返回处理结果。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::
  
  - **默认行为**：操作**客户端返回实例```res```**，向客户端返回处理结果。

    ```javascript
    onFinish(data, req, res) {
      // 当请求已返回时不再执行实际逻辑
      if (this.isEnded) {
        return;
      }
      // 当data为null或undefined时 - 返回204
      else if (isNullOrUndefined(data)) {
        res.status(204).end();
      }
      // 当data为Number类型时 - data作为状态码
      else if (getType(data) === VALUE_TYPE_NUMBER) {
        res.status(data).end();
      }
      // 其他情况 - data作为应答内容
      else {
        res.status(200).send(data);
      }
    }
    ```

- **```onError(error, req, res)```**

  - **使用场景**：对客户端请求处理过程中产生的异常进行统一处理。

  - **调用时机**：在任意请求处理阶段的跟函数中产生了未被捕获的异常，或使用[流程控制函数](#流程控制函数)执行```next(error)```时，将调用此方法触发[统一错误处理](#统一错误处理)。

  - **注意事项**：重写时无需执行```super```操作，当执行过程中产生异常时将触发**ServiceCore**中的[错误拦截器](/guide/web-service.html#错误拦截器)。

    ::: tip 提示
    我们在指定[统一错误处理](#统一错误处理)逻辑时，通常应直接操作**客户端返回实例```res```**，向客户端返回处理结果。

    另外，为了更精确的捕获执行过程中异常，我们应**根据阶段内实际逻辑的同步或异步指定此方法为```Function```或```AsyncFunction```。**
    :::
  
  - **默认行为**：操作**客户端返回实例```res```**，向客户端返回500状态码。

    ```javascript
    onError(error, req, res) {
      !this.isEnded && res.status(500).end();
    }
    ```

## 处理流程

![Handler处理流程](/images/Handler处理流程.jpg)

## 流程控制函数

**ServiceCore**自动为**每个客户端请求**创建与请求路径对应的**Handler实例**，并调用其私有实例方法```_onStart()```以启动处理流程。

::: danger 注意
Handler的实例方法```_onStart()```中实现了处理流程控制逻辑。**因此，我们在自定义Handler时，一定不要使用```_onStart```作为实例方法名。**
:::

通常，我们仅在指定[统一完成处理](#统一完成处理)和[统一错误处理](#统一错误处理)阶段直接操作**客户端返回实例```res```**，其余阶段中使用```next```进行流程控制：

- **执行```next(data)```时**：触发[统一完成处理](#统一完成处理)，```data```将作为实例方法```onFinish()```参数列表的第一个入参。

  ::: tip 提示
  **默认的[统一完成处理](#统一完成处理)逻辑使流程控制函数支持多种调用方式向客户端返回请求处理结果：**

  - **```next(message)```**：

    当**流程控制函数**指定的```data```**不为```Number```类型、```null```和```undefined```时**，认为期望向客户端返回处理结果报文。
    
    此时，将**向客户端返回200状态码，并将```data```作为返回报文。**

  - **```next(httpCode)```**：
  
    当**流程控制函数**指定的```data```**为```Number```类型时**，认为期望向客户端返回状态码。
    
    此时，将**向客户端返回```data```中指定的状态码和空报文。**

  - **```next()```、```next(null)```、```next(undefined)```**：
    
    > **仅在[请求后处理](#请求后处理)阶段执行```next()```时命中此逻辑，其余处理阶段中执行```next()```将分发至下一处理阶段。**
    
    当**流程控制函数**指定的```data```**为```null```或```undefined```时**，认为期望向客户端返回空报文。

    此时，将**向客户端返回204状态码和空报文。**

  **我们可以通过指定[统一完成处理](#统一完成处理)阶段的逻辑以定制流程控制函数向客户端返回请求处理结果的方式。**
  :::

- **执行```next(error)```时**：触发[统一错误处理](#统一错误处理)，```error```将作为实例方法```onError()```参数列表的第一个入参。

- **执行```next()```、```next(null)```、```next(undefined)```时**：进入下一处理阶段。

::: tip 提示
**Handler的流程控制函数与Express的中间件分发函数拥有一致的使用体验。因此，我们可以在Handler的中间件系统直接使用Express的中间件生态。**

不得不提的是，在**自定义Handler**时，我们**应按照Handler处理阶段对业务逻辑进行拆分以实现各个HOOK方法，并在期望阶段处理结束时使用```next()```分发处理流程。**

虽然在实现上，**Handler**使用**洋葱圈模型**串联了每个请求处理阶段，理论上可以通过```await next()```进行二次穿透。
:::

## 设置请求路径

在[Web服务-设置请求路径](/guide/web-service.html#设置请求路径)一章中，我们已经了解了如何通过重写**Handler**的静态方法```getRoutePath()```以指定**Handler**的请求路径规则。

接下来，我们将重点讨论指定**请求路径规则**时的注意事项：

- **请求路径规则必须为非空字符串。**

  **ServiceCore**在执行```bind()```时，将对**Handler**中指定的**请求路径规则**进行校验，如果为非字符串型值或空字符串将跳过对此**Handler**的挂载。

- **请求路径规则**应尽量使用```'/'```开头。

  **ServiceCore**在执行```bind()```时，还将对**Handler**中指定的**请求路径规则**进行校正，如果不以```'/'```开头时，将自动附加```'/'```作为前缀。

- **使用前缀型请求路径规则场景下，在业务层执行```bind()```时，应将指定了更长请求路径规则的Handler放置于绑定列表中较前的位置。**

  **ServiceCore**匹配与客户端请求对应的**Handler**时，将按照执行```bind()```时的指定的**Handler**顺序依次进行。
  
  ::: warning 注意
  比如，业务层在执行```bind()```时依次绑定了两个**Handler**，其**请求路径规则**分别为```'/api'```和```'/api/Test.do'```。

  此时当客户端请求路径为```/api/Test.do```时，**ServiceCore**将优先匹配到**请求路径规则**为```/api```的**Handler**用于此次请求处理。

  因此，我们在使用前缀型**请求路径规则**场景下，应在执行```bind()```时关注绑定列表中的**Handler**顺序。
  :::

## 初始化和析构

**Handler**的初始化和析构标志着**Handler**生命周期的开始和结束：

- 当**ServiceCore**分发客户端请求进入与请求路径匹配的**Handler**时，首先将触发[Handler初始化](#handler初始化)。
- 在[Handler初始化](#handler初始化)触发后（**非初始化执行完成后**），客户端请求返回时将触发[Handler析构](#handler析构)。

::: tip 提示
通常，我们仅在[统一完成处理](#统一完成处理)和[统一错误处理](#统一错误处理)中操作**客户端返回实例```res```**，向客户端返回请求处理结果以触发[Handler析构](#handler析构)。

当然也有例外，比如在**Handler**中使用**静态资源中间件```express.static```**，当客户端请求命中静态资源时将直接返回该资源，此时也将触发[Handler析构](#handler析构)。

我们应在[Handler初始化](#handler初始化)与[Handler析构](#handler析构)阶段执行**相反的资源操作**，以使内存得到有效释放。
:::

### Handler初始化

**我们通过重写Handler的实例方法```initHandler()```以指定Handler初始化阶段执行的逻辑。**

出于复用性考虑，推荐在**Handler初始化**阶段执行一些**与业务无关的通用初始化逻辑**，比如：**创建日志输出器**、**读取全局配置**等；**与业务相关的初始化逻辑**推荐放入[请求预处理](#请求预处理)阶段中。

::: tip 提示
通常，我们将**Handler初始化**阶段中创建的资源提升为**实例属性**，以在各个请求处理阶段中共享：

```javascript
initHandler(req, res, next) {
  // 创建基础输出器并提升为实例属性
  this.logger = new Core.BaseLogger();
  // 分发至下一处理阶段
  next();
}
```
:::

**Handler内置的异常捕获套件将自动作用在实例方法```initHandler```维度**。即：当```initHandler```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据Handler初始化阶段中实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```initHandler```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**Handler初始化**逻辑中包含**异步任务**时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

当然，不要忘记在**Handler初始化**阶段结束时使用[流程控制函数](#流程控制函数)分发处理流程至下一阶段。

---

**接下来，我们将实现一个在处理请求时打印请求处理开始时间的Handler。**

首先，创建一个用于**模拟耗时同步和异步任务**的```BaseHandler```作为基类：

```javascript
class BaseHandler extends Core.Handler {
  // 异步耗时任务
  asyncTask(duration = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  }

  // 同步耗时任务
  syncTask(duration = 0) {
    const startDate = new Date();
    while (true) {
      if (((new Date()) - startDate) > duration) {
        break;
      }
    }
  }
}
```

接下来，基于```BaseHandler```实现在请求处理时打印开始时间的**自定义Handler**：

**对于只包含同步行为的Handler初始化逻辑，我们使用```Function```类型的```initHandler```：**

```javascript
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  initHandler(req, res, next) {
    // 记录请求时间
    this.startDate = new Date();
    // 创建日志输出器并打印日志
    this.logger = new Core.BaseLogger();
    this.logger.log(`请求处理开始时间:[${this.startDate.toLocaleString()}]`);
    // 执行1000ms的同步任务
    this.syncTask(1000);
    next();
  }
}
```

同样，**当Handler初始化逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```initHandler```，并通过```await```关键字执行异步任务**：

```javascript {6,12-13}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  async initHandler(req, res, next) {
    // 记录请求时间
    this.startDate = new Date();
    // 创建日志输出器并打印日志
    this.logger = new Core.BaseLogger();
    this.logger.log(`请求处理开始时间:[${this.startDate.toLocaleString()}]`);
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    next();
  }
}
```

最后，我们将**自定义Handler**挂载至**ServiceCore**并启动服务：

```javascript
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

**最后的最后，我们打开控制台，使用```curl http://localhost:3000/Test.do -w 'res -> %{http_code}\n'```检查实现效果：**

- 服务端控制台将于收到请求时打印**请求开始处理时间**的相关日志。

- 客户端控制台将于请求发起后约**1000ms**收到**ServiceCore**返回的404状态码。

### Handler析构

**我们通过重写Handler的实例方法```destroyHandler()```以指定Handler析构阶段执行的逻辑。**

::: danger 注意
**进入Handler析构阶段时，客户端请求已返回处理结果。**

因此，我们在**Handler析构**阶段仅允许对**客户端请求实例**```req```和**客户端返回实例**```res```发起读取动作。

通常，我们在**Handler析构**阶段释放对[Handler初始化](#handler初始化)阶段创建资源的引用。
:::

当然，不要忘记在**Handler初始化**阶段结束时使用[流程控制函数](#流程控制函数)分发处理流程至下一阶段。

同样，**Handler内置的异常捕获套件也将自动作用在实例方法```destroyHandler```维度**。即：当```destroyHandler```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据Handler析构阶段中实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```destroyHandler```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**Handler析构**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

**Handler析构**阶段标志着**Handler生命周期**的终结，其中无法使用[流程控制函数](#流程控制函数)。

---

**接下来，我们将完善Handler初始化阶段中的🌰，使其在请求处理结束时执行任务并打印处理耗时。**

**对于只包含同步行为的Handler析构逻辑，我们使用```Function```类型的```destroyHandler```：**

```javascript {17-25}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  initHandler(req, res, next) {
    // 记录请求时间
    this.startDate = new Date();
    // 创建日志输出器并打印日志
    this.logger = new Core.BaseLogger();
    this.logger.log(`请求处理开始时间:[${this.startDate.toLocaleString()}]`);
    // 执行1000ms的同步任务
    this.syncTask(1000);
    next();
  }

  destroyHandler(req, res) {
    // 执行1000ms的同步任务
    this.syncTask(1000);
    // 计算并打印日志
    const duration = (new Date()) - this.startDate;
    this.logger.log(`请求处理耗时[${duration}]ms`);
    // 关闭日志输出器
    this.logger.close();
  }
}
```

同样，**当Handler析构逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```destroyHandler```，并通过```await```关键字执行异步任务**：

```javascript {17-25}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  async initHandler(req, res, next) {
    // 记录请求时间
    this.startDate = new Date();
    // 创建日志输出器并打印日志
    this.logger = new Core.BaseLogger();
    this.logger.log(`请求处理开始时间:[${this.startDate.toLocaleString()}]`);
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    next();
  }

  async destroyHandler(req, res) {
    // 执行1000ms的同步任务
    await this.asyncTask(1000);
    // 计算并打印日志
    const duration = (new Date()) - this.startDate;
    this.logger.log(`请求处理耗时[${duration}]ms`);
    // 关闭日志输出器
    this.logger.close();
  }
}
```

**最后，我们打开控制台，使用```curl http://localhost:3000/Test.do -w 'res -> %{http_code}\n'```检查实现效果：**

- 服务端控制台将于收到请求时打印**请求开始处理时间**的相关日志。

- 服务端控制台将于收到请求后约**2000ms**打印**请求处理时长**的相关日志。

- 客户端控制台将于请求发起后约**1000ms**收到**ServiceCore**返回的404状态码。

## 中间件系统

**Handler使用的中间件系统兼容Express生态，且支持动态中间件**。

**我们通过重写Handler的实例方法```getMiddlewares```以指定其应用于客户端请求的中间件列表。**

::: tip 提示
在[Handler初始化](#handler初始化)阶段完成后，**Handler**将构建并执行**中间件列表**。

需要注意的是：**Handler维度指定的中间件将仅作用于匹配Handler请求路径规则的客户端请求。**
:::

同样，**Handler内置的异常捕获套件也将自动作用在实例方法```getMiddlewares```维度**。即：当```getMiddlewares```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据构建中间件列表时实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```getMiddlewares```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**构建中间件列表**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

构建**中间件列表**时无需使用[流程控制函数](#流程控制函数)控制处理流程，使用```return```关键字返回应用于客户端请求处理的**中间件列表**即可。

---

**接下来，我们将实现一个在请求处理过程中动态指定中间件列表的Handler。**

首先，创建一个用于**模拟耗时同步、异步任务和创建中间件**的```BaseHandler```作为基类：

```javascript
class BaseHandler extends Core.Handler {
  // 异步任务
  asyncTask(duration = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  }

  // 同步任务
  syncTask(duration = 0) {
    const startDate = new Date();
    while (true) {
      if (((new Date()) - startDate) > duration) {
        break;
      }
    }
  }

  // 创建中间件
  createMiddleware(value) {
    // 将在res.header中自动记录应用于请求处理的中间件
    return (req, res, next) => {
      const middlewareFieldKey = 'x-middlewares';
      const middlewareFieldValue = res.get(middlewareFieldKey);
      const middlewareList = middlewareFieldValue ? middlewareFieldValue.split(',') : [];
      middlewareList.push(`middleware_${value}`);
      res.set(middlewareFieldKey, middlewareList.join(','));
      next();
    }
  }
}
```

接下来，基于```BaseHandler```实现根据客户端请求入参动态指定中间件列表的**自定义Handler**：

**对于只包含同步行为的构建中间件列表逻辑，我们使用```Function```类型的```getMiddlewares```：**

```javascript
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }
  
  getMiddlewares(req, res) {
    // 执行1000ms的同步任务
    this.syncTask(1000);
    // 构建中间件列表
    const middlewares = [];
    const { count = 0 } = req.query;
    for (let i = 1; i < parseInt(count) + 1; i++) {
      middlewares.push(this.createMiddleware(i));
    }
    return middlewares;
  }
}
```

同样，**当构建中间件列表逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```getMiddlewares```，并通过```await```关键字执行异步任务**：

```javascript {6-8}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }
  
  async getMiddlewares(req, res) {
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    // 构建中间件列表
    const middlewares = [];
    const { count = 0 } = req.query;
    for (let i = 1; i < parseInt(count) + 1; i++) {
      middlewares.push(this.createMiddleware(i));
    }
    return middlewares;
  }
}
```

最后，我们将**自定义Handler**挂载至**ServiceCore**并启动服务：

```javascript
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

**最后的最后，我们打开控制台，使用```curl http://localhost:3000/Test.do\?count\=5 -D -```检查实现效果：**

- 客户端控制台将于请求发起后约**1000ms**打印请求处理结果。

- 客户端收到的请求处理结果中```res.header['x-middlewares']```内**记录了5个中间件的信息**。

### 中间件拦截

**Handler构建中间件列表完成后，将逐个分发其中的中间件。**

**我们通过重写实例方法```onInterceptMiddleware```以拦截每个中间件的分发以动态控制其执行行为。**

同样，**Handler内置的异常捕获套件也将自动作用在实例方法```onInterceptMiddleware```维度**。即：当```onInterceptMiddleware```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据中间件拦截时实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```onInterceptMiddleware```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**中间件拦截**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

**Handler**将自动包装**当前分发的中间件**和**中间件执行函数**作为```onInterceptMiddleware```参数列表的第一个参数```middleware```：

- **```middleware.type```**：中间件本体函数，用于进行中间件标识校验。

- **```middleware.exec```**：中间件执行函数，用于实际执行中间件，其参数列表为```(callBack)```。
  
  ::: tip 提示
  **```middleware.exec(callBack)```实际上是```middleware.type(req, res, callBack)```的语法糖，中间件执行过程中产生的异常将通过```callBack```回抛。**

  **我们可以通过```require('util').promisify```包装```middleware.exec```，并使用```await```关键字调用**，以保证在```AsyncFuntion```类型的```onInterceptMiddleware```中的逻辑一致性。
  :::

当然，在对中间件进行拦截处理后，不要忘记使用[流程控制函数](#流程控制函数)分发处理流程至下一阶段。

---

**接下来，我们将完善构建中间件列表时的🌰，以50%的概率随机执行中间件列表中的中间件。**

**对于只包含同步行为的中间件拦截逻辑，我们使用```Function```类型的```onInterceptMiddleware```：**

```javascript {18-25}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }
  
  getMiddlewares(req, res) {
    // 执行1000ms的同步任务
    this.syncTask(1000);
    // 构建中间件列表
    const middlewares = [];
    const { count = 0 } = req.query;
    for (let i = 1; i < parseInt(count) + 1; i++) {
      middlewares.push(this.createMiddleware(i));
    }
    return middlewares;
  }

  onInterceptMiddleware(middleware, req, res, next) {
    // 每个中间件都执行500ms的同步任务
    this.syncTask(500);
    // 计算概率并应用至执行链路
    const { exec } = middleware;
    const canExec = Math.random() >= 0.5;
    canExec ? exec((result) => next(result)) : next();
  }
}
```

同样，**当构中间件拦截逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```onInterceptMiddleware```，并通过```await```关键字执行异步任务**：

```javascript {20-29}
const { promisify } = require('util');

class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  async getMiddlewares(req, res) {
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    // 构建中间件列表
    const middlewares = [];
    const { count = 0 } = req.query;
    for (let i = 1; i < parseInt(count) + 1; i++) {
      middlewares.push(this.createMiddleware(i));
    }
    return middlewares;
  }

  async onInterceptMiddleware(middleware, req, res, next) {
    // 每个中间件都执行500ms的异步任务
    await this.asyncTask(500);
    // 计算概率并应用至执行链路
    const { exec } = middleware;
    const canExec = Math.random() >= 0.5;
    canExec
      ? next(await promisify(exec)())
      : next();
  }
}
```

**最后，我们打开控制台，使用```curl http://localhost:3000/Test.do\?count\=5 -D -```检查实现效果：**

- 客户端控制台将于请求发起后约**3500ms**打印请求处理结果。

- 客户端收到的请求处理结果中```res.header['x-middlewares']```内**随机记录了0-5个中间件的信息**。

## 请求预处理

**Handler**维度的**中间件列表**内最后一个中间件的拦截逻辑执行完成后，将进入**请求预处理**阶段。

**我们通过重写Handler的实例方法```preHandler()```以指定请求预处理阶段执行的逻辑。**

::: tip 提示
**通常，我们在请求预处理阶段执行实际业务处理前的准备动作。**

比如，在实现支持客户端使用多种请求方式的**自定义Handler**时，可以在**请求预处理**阶段对不同请求方式带入的参数进行归并统一。

或是**提前创建请求处理所需的基础资源**。

> **我们通常在[请求后处理](#请求后处理)阶段对请求参数进行有效性校验并驳回参数无效的客户端请求。因此，出于性能考虑，我们应在请求预处理阶段创建与客户端请求类型无关的基础资源。**

:::

同样，**Handler内置的异常捕获套件也将自动作用在实例方法```preHandler```维度**。即：当```preHandler```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据请求预处理中实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```preHandler```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**请求预处理**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

当然，不要忘记在**请求预处理**阶段结束时使用[流程控制函数](#流程控制函数)分发处理流程至下一阶段。

---

**接下来，我们将实现一个在预处理阶段归并请求参数并向客户端返回的Handler。**

首先，创建一个用于**模拟耗时同步和异步任务**的```BaseHandler```作为基类：

```javascript
class BaseHandler extends Core.Handler {
  // 异步耗时任务
  asyncTask(duration = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  }

  // 同步耗时任务
  syncTask(duration = 0) {
    const startDate = new Date();
    while (true) {
      if (((new Date()) - startDate) > duration) {
        break;
      }
    }
  }
}
```

接下来，基于```BaseHandler```实现自动归并**GET方式**和**POST方式**中客户端附加至```query```和```body```中参数的**自定义Handler**：

**对于只包含同步行为的请求预处理逻辑，我们使用```Function```类型的```preHandler```：**

```javascript
const bodyParser = require('body-parser');
const jsonParserMiddleware = bodyParser.json({ limit: 2 * 1024 * 1024 });
const qsParserMiddleware = bodyParser.urlencoded({ limit: 2 * 1024 * 1024, extended: true });

class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  getMiddlewares() {
    // 挂载解析HTTP BODY的中间件
    return [jsonParserMiddleware, qsParserMiddleware];
  }

  preHandler(req, res, next) {
    // 执行1000ms的同步任务
    this.syncTask(1000);
    // 合并query和body
    const body = req.body;
    const query = req.query;
    req.requestParams = Object.assign({}, body, query);
    // 向客户端返回
    next(req.requestParams);
  }
}
```

同样，**当请求预处理逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```preHandler```，并通过```await```关键字执行异步任务**：

```javascript {15-17}
const bodyParser = require('body-parser');
const jsonParserMiddleware = bodyParser.json({ limit: 2 * 1024 * 1024 });
const qsParserMiddleware = bodyParser.urlencoded({ limit: 2 * 1024 * 1024, extended: true });

class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  getMiddlewares() {
    // 挂载解析HTTP BODY的中间件
    return [jsonParserMiddleware, qsParserMiddleware];
  }

  async preHandler(req, res, next) {
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    // 合并query和body
    const body = req.body;
    const query = req.query;
    req.requestParams = Object.assign({}, body, query);
    // 向客户端返回
    next(req.requestParams);
  }
}
```

最后，我们将**自定义Handler**挂载至**ServiceCore**并启动服务：

```javascript
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

**最后的最后，我们打开控制台，使用```curl http://localhost:3000/Test.do\?queryKey1\=queryValue1\&queryKey2\=queryValue2 -d 'bodyKey1=bodyValue1&bodyKey2=bodyValue2'```检查实现效果：**

- 客户端控制台将于请求发起后约**1000ms**打印请求处理结果。

- 客户端收到的请求处理结果中将**包含```query```和```body```中附带的参数**。

## 请求后处理

在[请求预处理](#请求预处理)阶段使用[流程控制函数](#流程控制函数)分发至下一处理阶段时，**Handler**将尝试调用**与客户端请求方式匹配的实例方法**进入**请求后处理**阶段。

**我们通过重写Handler中与请求方式对应的实例方法以指定其请求后处理逻辑**。比如，实现实例方法```postHandler```将指定客户端POST请求对应的后处理逻辑。

::: tip 提示
**在进入请求后处理阶段时，如果Handler中没有实现与请求方式对应的实例方法，默认使用```defaultHandler```作为后处理逻辑。**

默认的```defaultHandler```逻辑中，将直接使用[流程控制函数](#流程控制函数)执行```next(404)```向客户端返回404状态码。
:::

同样，**Handler内置的异常捕获套件也将自动作用在```[METHOD]Handler```维度**。即：**全部请求方式对应的实例方法**和```defaultHandler```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据请求后处理中实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```[METHOD]Handler```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**请求后处理**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

> **通常，在请求后处理阶段首先应对客户端附带的参数进行有效性判断，驳回参数无效的客户端请求；在请求参数有效时，触发实际的业务处理。**

**需要注意的是，请求后处理阶段为请求处理链路的末端节点，通常应使用[流程控制函数](#流程控制函数)向客户端发起应答动作**。另外，在**请求后处理**阶段执行```next()```时不会继续分发处理流程至下一阶段，而是进入[统一完成处理](#统一完成处理)。

---

**接下来，我们将实现一个支持客户端通过POST请求读取本地指定目录的Handler。**

**对于只包含同步行为的请求后处理逻辑，我们使用```Function```类型的```postHandler```：**

```javascript
const fs = require('fs');

class Handler extends Core.Handler {
  static getRoutePath() {
    return '/Test.do';
  }

  postHandler(req, res, next) {
    const { path } = req.query;
    try {
      // 同步读取目录内容并向客户端返回结果
      const result = fs.readdirSync(path);
      next(result);
    } catch (error) {
      // 执行过程中产生异常时向客户端返回异常信息
      next(error.message);
    }
  }
}
```

同样，**当请求后处理逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```postHandler```，并通过```await```关键字执行异步任务**：

```javascript {9-17}
const fs = require('fs');
const { promisify } = require('util');

class Handler extends Core.Handler {
  static getRoutePath() {
    return '/Test.do';
  }

  async postHandler(req, res, next) {
    const { path } = req.query;
    // 异步读取目录内容并向客户端返回结果
    const result = await promisify(fs.readdir)(path).catch((error) => {
      // 执行过程中产生异常时向客户端返回异常信息
      next(error.message);
    });
    result && next(result);
  }
}
```

最后，我们将**自定义Handler**挂载至**ServiceCore**并启动服务：

```javascript
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
serviceCore.start();
```

**最后的最后，我们打开控制台，使用```curl http://localhost:3000/Test.do\?path\=[本地目录绝对路径]```检查实现效果：**

- 当指定的**本地目录绝对路径**存在时，客户端收到的处理结果为**本地目录中的内容**。

- 当未指定**本地目录绝对路径**或**本地目录绝对路径**不存在时，客户端收到的处理结果为**异常原因**。

::: warning 注意
**样例代码中使用的异常处理方式不推荐在实际业务代码中使用**。对于如何优雅的处理异常，我们将在[统一错误处理](#统一错误处理)中进行详细讨论。
:::

## 统一完成处理

在**任意请求处理阶段**中使用[流程控制函数](#流程控制函数)执行```next(data)```时将触发**统一完成处理**。

**我们通过重写Handler的实例方法```onFinish()```以指定统一完成处理阶段执行的逻辑。**

::: tip 说明
**我们通常在统一完成处理阶段完成对客户端返回内容的统一结构组装，并操作客户端返回实例```res```向客户端返回处理结果。**

需要注意的是，直接操作**客户端返回实例**```res```发起返回动作将跳过**统一完成处理**阶段直接触发[Handler析构](#handler析构)。

因此，**我们在请求处理过程中期望向客户端返回处理结果时应使用[流程控制函数](#流程控制函数)，而不是直接操作客户端返回实例```res```**。
:::

同样，**Handler内置的异常捕获套件也将自动作用在实例方法```onFinish```维度**。即：当```onFinish```执行过程中产生了未被捕获的异常时将自动进入[统一错误处理](#统一错误处理)。

因此，我们应**根据请求预处理中实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```onFinish```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**统一完成处理**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

---

**接下来，我们将完善请求后处理中的🌰，为其向客户端的返回内容添加统一结构。**

首先，创建一个用于**模拟耗时同步和异步任务**的```BaseHandler```作为基类：

```javascript
class BaseHandler extends Core.Handler {
  // 异步耗时任务
  asyncTask(duration = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  }

  // 同步耗时任务
  syncTask(duration = 0) {
    const startDate = new Date();
    while (true) {
      if (((new Date()) - startDate) > duration) {
        break;
      }
    }
  }
}
```

::: tip 提示
**通常，我们不需要完全重写```onFinish```中包含的逻辑，而是使用```super.onFinish()```复用默认的统一完成处理逻辑。**

对于**统一完成处理**默认支持的行为，我们可以参考[流程控制函数](#流程控制函数)。
:::

接下来，我们将**自定义Handler**继承的基类变更为```BaseHandler```，并在**统一完成处理**中完成报文结构包装：

**对于只包含同步行为的请求预处理逻辑，我们使用```Function```类型的```onFinish```：**

```javascript {1,18-24}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  postHandler(req, res, next) {
    const { path } = req.query;
    try {
      // 同步读取目录内容并向客户端返回结果
      const result = fs.readdirSync(path);
      next(result);
    } catch (error) {
      // 执行过程中产生异常时向客户端返回异常信息
      next(error.message);
    }
  }

  onFinish(data, req, res) {
    // 执行1000ms的同步任务
    this.syncTask(1000);
    // 构造报文结构并执行原始的onFinish()方法向客户端返回
    const backMessage = { code: 0, data };
    super.onFinish(backMessage, req, res);
  }
}
```

同样，**当请求后处理逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```onFinish```，并通过```await```关键字执行异步任务**：

```javascript {14-16}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  async postHandler(req, res, next) {
    const { path } = req.query;
    const result = await promisify(fs.readdir)(path).catch((error) => {
      next(error.message);
    });
    result && next(result);
  }

  async onFinish(data, req, res) {
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    // 构造报文结构并执行原始的onFinish()方法向客户端返回
    const backMessage = { code: 0, data };
    super.onFinish(backMessage, req, res);
  }
}
```

**最后，我们打开控制台，使用```curl http://localhost:3000/Test.do\?path\=[本地目录绝对路径]```检查实现效果：**

- 客户端控制台将于请求发起后约**1000ms**打印请求处理结果，且处理结果拥有统一的结构```{ code: 0, data: [处理结果] }```。

- 当指定的**本地目录绝对路径**存在时，客户端收到的处理结果为**本地目录中的内容**。

- 当未指定**本地目录绝对路径**或**本地目录绝对路径**不存在时，客户端收到的处理结果为**异常原因**。

::: warning 注意
**样例代码中使用的异常处理方式不推荐在实际业务代码中使用**。对于如何优雅的处理异常，我们将在[统一错误处理](#统一错误处理)中进行详细讨论。
:::

## 统一错误处理

**任意请求处理阶段**的根函数中产生未被捕获的异常时，**Handler**将自动引导处理流程进入**统一完成处理**阶段。

另外，我们可以在**请求处理任意阶段**中使用[流程控制函数](#流程控制函数)执行```next(error)```手动触发**统一完成处理**。

**我们通过重写Handler的实例方法```onError```以指定统一完成处理阶段执行的逻辑。**

::: tip 说明
**我们通常在统一错误处理阶段处理异常后，直接操作客户端返回实例```res```向客户端返回处理结果。**
:::

同样，**Handler内置的异常捕获套件也将自动作用在实例方法```onError```维度**。与其他处理阶段不同的是，**当```onError```执行过程中产生了未被捕获的异常时将进入ServiceCore的[错误拦截器](/guide/web-service.html#错误拦截器)。**

因此，我们应**根据请求预处理中实际逻辑的同步或异步，选择使用```Function```或```AsyncFunction```类型的```onFinish```。**

::: warning 注意
**Handler内置的异常捕获机制仅在请求处理节点的根函数中产生未被捕获的异常时才产生效力。**

因此，当**统一错误处理**逻辑中包含异步任务时，我们**可以使用```async/await```和```Promise```处理异步任务，以保证异常可以正常抛出。**
:::

---

**接下来，我们将使用更优雅的异常处理方案来完善请求后处理中的🌰。**

首先，创建一个用于**模拟耗时同步和异步任务**的```BaseHandler```作为基类：

```javascript
class BaseHandler extends Core.Handler {
  // 异步耗时任务
  asyncTask(duration = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  }

  // 同步耗时任务
  syncTask(duration = 0) {
    const startDate = new Date();
    while (true) {
      if (((new Date()) - startDate) > duration) {
        break;
      }
    }
  }
}
```
接下来，我们将**自定义Handler**继承的基类变更为```BaseHandler```，删除**Handler后处理**中异常处理相关的代码，并在**统一错误处理**中收口异常处理：

**对于只包含同步行为的请求预处理逻辑，我们使用```Function```类型的```onError```：**

```javascript {1,6-11,13-18}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  postHandler(req, res, next) {
    const { path } = req.query;
    // 同步读取目录内容并向客户端返回结果
    const result = fs.readdirSync(path);
    next(result);
  }

  onError(error, req, res) {
    // 执行1000ms的同步任务
    this.syncTask(1000);
    // 向客户端返回异常信息
    res.status(500).send(error.message);
  }
}
```

同样，**当请求后处理逻辑中包含异步行为时，我们使用```AsyncFunction```类型的```onError```，并通过```await```关键字执行异步任务**：

```javascript {1,6-10,12-17}
class Handler extends BaseHandler {
  static getRoutePath() {
    return '/Test.do';
  }

  async postHandler(req, res, next) {
    const { path } = req.query;
    const result = await promisify(fs.readdir)(path);
    next(result);
  }

  async onError(error, req, res) {
    // 执行1000ms的异步任务
    await this.asyncTask(1000);
    // 向客户端返回异常信息
    res.status(500).send(error.message);
  }
}
```

**最后，我们打开控制台，使用```curl http://localhost:3000/Test.do\?path\=[不存在的本地目录绝对路径]```检查实现效果：**

- 客户端控制台将于请求发起后约**1000ms**打印请求处理结果，处理结果为**异常原因**。
