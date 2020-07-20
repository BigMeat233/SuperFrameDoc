# 多进程架构

通常，我们使用**Master/Worker进程模型**使应用程序可以最大化使用CPU资源：

- **Master进程**：协调进程资源，比如：创建/重启**Worker进程**、全局状态/行为维护等。

- **Worker进程**：处理实际业务。

在多进程架构的应用程序中，**Master进程**中的执行的操作具有应用程序级别的唯一性，而在不同的进程拥有完全独立的内存空间，进程内的状态完全隔离。因此，对于在多个**Worker进程**中共享的状态的场景，我们可以使用Corejs提供的[全局对象](#全局对象)实现。

::: warning 注意
在多**Worker进程**的应用程序中，每个**Worker进程**需要严格保证无状态设计，否则可能产生奇怪的问题。
:::

---

Corejs引入了[ClusterCore](#clustercore)和[AppMain](#appmain)以实现应用程序的多进程架构。其中：

- **ClusterCore**：是多进程架构的核心，其中包含进程管理、通讯相关的API。

- **AppMain**：实现应用程序生命周期的各个阶段，将被**ClusterCore**加载和调用。

::: tip 提示
通常，我们应该把应用程序的业务逻辑应全部装入**AppMain**，在**AppMain**外部只需要：

1. 执行```Core.ClusterCore.init()```指定应用程序使用的**AppMain**。

2. 执行```Core.ClusterCore.start()```启动**ClusterCore**。

**ClusterCore**将在恰当的时间点自动调用**AppMain**中对应生命周期以驱动应用程序运行。
:::

## 多进程模型

[多进程模型](./test.png)

## AppMain

**AppMain**抽象了**应用模型**和**进程模型**，覆盖了应用程序生命周期的各个阶段：

- [```onProcessDidInit(processId, launchParams)```](#onprocessdidinit)：**Master/Worker进程**完成初始化时触发。

- [```onWorkerProcessDidExit(exitedProcessId, exitedDetail, reboot)```](#onworkerprocessdidexit)：**Master进程**捕获到**Worker进程**退出时触发。

- [```onProcessWillReceiveMessage(fromProcessId, data, next)```](#onprocesswillreceivemessage)：**Master/Worker进程**接收到进程间通信消息时触发。

- [```onProcessDidReceiveMessage(fromProcessId, data)```](#onprocessdidreceivemessage)：**Master/Worker进程**决定处理进程间通信消息时触发。

- [```onProcessDidDiscardMessage(fromProcessId, data)```](#onprocessdiddiscardmessage)：**Master/Worker进程**决定丢弃进程间通信消息时触发。

::: tip 提示
我们在实现**AppMain**时，需要继承自```Core.AppMain```。
:::

### 实例属性

[ClusterCore](#clustercore)在初始化过程中自动创建**AppMain**实例。因此，在应用程序的任意生命周期中，可以直接使用```this```访问**AppMain**的实例属性：

- ```processId```：当前进程的ID。

  ::: tip 说明
  **Master进程**和**Worker进程**中的```processId```有不同的构成规则：

  - **Master进程**中，进程ID为```'M'```。

  - **Worker进程**中，进程ID为```'W:<%进程偏移%>'```。
  
  进程偏移反映了**Master进程**创建**Worker进程**的时序，为```>= 1```的整数。
  :::

- ```clusterCore```：创建并加载**AppMain**实例的[ClusterCore](#clustercore)实例。

- ```launchParams```：进程的初始化参数，即**Master进程**中的```process.argv```。

::: danger 注意
只有在```onProcessDidInit()```的```super```操作执行结束后，才可以对**AppMain**中内置的实例属性进行访问。

因此，我们在重写```onProcessDidInit()```必须执行```super```操作，以保证**AppMain**中实例属性的正确性。
:::

### 进程生命周期

我们可以在**AppMain**中指定应用程序在进程维度生命周期中的行为：

- **Master进程**、**Worker进程**初始化完成时。

- **Master进程**检测到有**Worker进程**退出时。

我们可以在**Master进程**中使用```process.on()```以捕获**Master进程**的退出事件。

#### ```onProcessDidInit()```

**Master进程**、**Worker进程**初始化完成时将触发此方法。通常，我们在此方法中根据```processId```判断当前的进程环境执行不同的逻辑：

- 当前是**Master进程**时，使用```Core.ClusterCore.fork()```创建**Worker进程**，或执行一些在期望在应用程序维度保证唯一性的操作。

- 当前是**Worker进程**时，执行实际业务，比如：启动**ServiceCore**等。

::: tip 提示
在微服务架构中，如果需要在多个应用程序间同步或共享数据，我们可以使用分布式协调工具，比如：```ZooKeeper```、```Redis```等。
:::

#### ```onWorkerProcessDidExit()```

**Master进程**检测到有**Worker进程**退出时将触发此方法。我们在此方法中有两种重新拉起**Worker进程**的方式：

- 使用```reboot()```：新的**Worker进程**将复用退出进程的```processId```。

- 使用```Core.ClusterCore.fork()```：新的**Worker进程**将使用实际的进程偏移创建```processId```。

#### 实现原理

在**Master进程**中，执行```Core.ClusterCore.start()```将触发**Master进程**的初始化动作：

1. 首先，使用nodejs原生模块```cluster```监听**Worker进程**的退出消息，在**Worker进程**退出时调用```onWorkerProcessDidExit()```通知业务层处理。

2. 接下来，使用同样方式监听**Worker进程**的通信消息。

3. 最后，调用```onProcessDidInit()```通知业务层**Master进程**已初始化完成。

---

在**Worker进程**中执行```Core.ClusterCore.start()```时，将触发**Worker进程**的初始化动作：

1. 首先，使用```process.on()```监听来自**Master进程**的通信消息。

2. 接下来，向**Master进程**发起[TraceIPC](#traceipc)以获取初始化信息。

3. 最后，在收到**Master进程**应答的初始化信息时调用```onProcessDidInit()```通知业务层**Worker进程**已初始化完成。

::: tip 说明
当**Master进程**和**Worker进程**收到了进程间通信消息时，**ClusterCore**将对消息进行分类过滤处理：

- 对于**自定义通信消息**，**ClusterCore**将直接引导其进入**AppMain**中进行[消息处理](#消息处理)。

- 对于**内部通信消息**，**ClusterCore**将仅执行内部处理，不再引导其进入**AppMain**中进行[消息处理](#消息处理)。
:::

## ClusterCore

**ClusterCore**被设计为进程级别单例，在实例化时自动根据当前运行进程的类型加载对应的API。即使在不同的进程环境中，相同的API在使用体验上完全相同。因此，我们在使用**ClusterCore**时通常无需关注进程类型。

需要注意的是，运行在**Master进程**中的**ClusterCore**拥有**创建Worker进程**和**关闭应用程序**的能力。即运行在**Worker进程**中的**ClusterCore**无法调用以下两个API：

- ```fork(workerNum)```：创建指定数量的**Worker进程**。

- ```shutdown([exitCode])```：关闭进程组中的所有**Master进程**和**Worker进程**。

---

我们已经知道，**ClusterCore**自动调用**AppMain**中对应生命周期方法以驱动应用程序的运行。因此，在使用**ClusterCore**前需要指定**AppMain**进行初始化。

接下来，让我们来看一个使用**ClusterCore**和**AppMain**的标准样例：

```javascript
const Core = require('node-corejs');

/**
 * 实现AppMain
 */
class AppMain extends Core.AppMain {
  /**
   * 进程初始化完成
   * @override
   */
  onProcessDidInit(processId, launchParams) {
    // 重写时必须执行super操作
    super.onProcessDidInit(processId, launchParams);

    // 在Master进程初始化完成后 - 创建4个Worker进程
    if (processId === 'M') {
      console.log(`Master进程初始化完成`);
      Core.ClusterCore.fork(4);
    }
    // 在Worker进程初始化完成后 - 执行业务逻辑
    else {
      console.log(`Worker进程初始化完成 -> ${processId}`);
      // 模拟worker进程退出触发重启
      setTimeout(() => { process.exit() }, 1500);
    }
  }

  /**
   * Worker进程退出
   * @override
   */
  onWorkerProcessDidExit(exitedProcessId, exitedDetail, reboot) {
    // 在worker进程退出时自动重启
    reboot();
  }
}

// 初始化并启动ClusterCore
Core.ClusterCore.init(AppMain);
Core.ClusterCore.start();
```

## 进程间通信

进程间通信有两种场景：

1. **发送方**向**接收方**单向发送消息，无需关注**接收方**的应答情况，即发起[IPC](#ipc)。

2. **发送方**向**接收方**发送消息后，需要收到**接收方**应答后才认为通信完成，即发起[TraceIPC](#traceipc)。

### API设计

**ClusterCore**提供了在进程组任意进程间发起[IPC](#ipc)或[TraceIPC](#traceipc)的API：

- [```sendData(processId, data[, callBack])```](#senddata)：用于发起[IPC](#ipc)、[应答TraceIPC](#应答traceipc)。

- [```sendDataWithTraceCallBack(processId, data, traceCallBack[, callBack])```](#senddatawithtracecallback)：用于[发起TraceIPC](#发起traceipc)。

---

#### ```sendData()```

##### 使用场景

- 在**发送方**调用时，用于向**接收方**发送单向进程间通信消息，即发起[IPC](#ipc)。

- 在**接收方**调用时，用于向**发送方**发送应答消息，即[应答TraceIPC](#应答traceipc)。

##### 参数列表

- ```processId```：**接收方**的进程ID，必填项。我们可以通过```Core.ClusterCore.getAllProcessIds()```获取进程组中的所有进程ID。

- ```data```：进程间通信的消息，必填项。我们将在[消息结构](#消息结构)一节中具体讨论消息结构的细节。

- ```callBack```：进程间通信的执行结果，非必填项。是一个cps风格的```Function```，其参数列表为```(error)```。

---

#### ```sendDataWithTraceCallBack()```

##### 使用场景

**发送方**向**接收方**发送需要应答的进程间通信消息，即[发起TraceIPC](#发起traceipc)。

##### 参数列表

- ```processId```：**接收方**的进程ID，必填项。我们可以通过```Core.ClusterCore.getAllProcessIds()```获取进程组中的所有进程ID。

- ```data```：进程间通信时传输的消息，必填项。我们将在[消息结构](#消息结构)一节中具体讨论消息的细节。

- ```traceCallBack```：**发送方**收到应答消息时执行的回调，必填项。其参数列表为```(resData)```。

- ```callBack```：进程间通信的执行结果，非必填项。是一个cps风格的```Function```，其参数列表为```(error)```。

::: tip 提示
```sendData()```和```sendDataWithTraceCallBack()```使用```callBack```回调进程间通信的执行结果：

- 通信成功时，```error```的值为```null```。

- 通信失败时，```error```的值为通信失败的原因。

**ClusterCore**将拒绝在相同的进程间发起的通信动作。
:::

### 消息结构

进程间通信消息是一个```Object```，nodejs将在传输过程中对其进行序列化。

::: tip 提示
为避免序列化对消息的完整性产生影响，我们构造消息结构时应使用基本类型构成的```field```，即：

- ```Array```
- ```Object```
- ```Number```
- ```String```
- ```Boolean```
:::

---

**ClusterCore**将在发起进程间通信时向消息结构中填充基本信息：

- ```toProcessId```：**接收方**的进程ID。
- ```fromProcessId```：**发送方**的进程ID。

另外，**ClusterCore**还将在[发起TraceIPC](#发起traceipc)时，向消息结构中填充```traceId```用于追踪和定位整条通信链路。

---

对于**Worker进程**之间的通信，将通过**Master进程**进行转发。此类型的进程间通信分为三个阶段：

1. **发送方**向**Master进程**发起**内部TraceIPC**。
2. **Master进程**尝试转发消息至**接收方**，并向**发送方**应答转发结果。
3. **发送方**根据向**Master进程**的应答结果和发起**内部TraceIPC**的执行结果向业务层反馈此次进程间通信的结果。

**Worker进程**间也可能[发起TraceIPC](#发起traceipc)。出于逻辑的一致性考虑，**ClusterCore**将在执行步骤①时不再占用```traceId```，而是向消息结构中填充```transitTraceId```用于追踪消息的转发结果。

::: danger 注意
**ClusterCore将拒绝消息结构中不包含```action```的进程间通信。**

另外，**ClusterCore**可能向消息结构中填充以下```field```：

- ```traceId```
- ```toProcessId```
- ```fromProcessId```
- ```transitTraceId```

在业务层指定这些```field```时拥有更高的优先级，将覆盖**ClusterCore**的填充值，可能导致实际行为与预期不符。因此，我们在发起进程间通信时应谨慎使用这些```field```。
:::

### IPC

对于无需关注**接收方**应答的单向进程间通信，使用```Core.ClusterCore.sendData()```直接向目标进程发送消息即可。

::: tip 提示
在构造进程间通信的消息结构时，附属数据推荐存储在```Object```类型的```payload```中。
:::

让我们来看一个单向进程间通信的🌰：

```javascript
const Core = require('node-corejs');

/**
 * 实现AppMain
 */
class AppMain extends Core.AppMain {
  /**
   * 进程初始化完成
   * @override
   */
  onProcessDidInit(processId, launchParams) {
    super.onProcessDidInit(processId, launchParams);
    // Master进程 - 创建两个Worker进程
    if (processId === 'M') {
      Core.ClusterCore.fork(2);
    }
    // Worker进程 - 使两个Worker进程进行通信
    else {
      Core.ClusterCore.getAllProcessIds((err, processIds) => {
        if (err || processIds.length !== 3) {
          return;
        }
        const toProcessId = processIds[1];
        const fromProcessId = processIds[2];
        this.processId === fromProcessId && Core.ClusterCore.sendData(toProcessId, {
          action: 'TEST_IPC_ACTION',
          payload: { value: '这是一个🌰' }
        });
      });
    }
  }

  /**
   * 进程确认处理自定义通信消息
   * @override
   */
  onProcessDidReceiveMessage(fromProcessId, data) {
    console.log(`进程[${this.processId}]收到了来自进程[${fromProcessId}]的消息:[${JSON.stringify(data)}]`);
  }
}

// 使用AppMain初始化ClusterCore并启动
Core.ClusterCore.init(AppMain);
Core.ClusterCore.start();
```

### TraceIPC

对于需要**接收方**应答的双向的进程间通信，需要**发送方**和**接收方**进行协作：

- 在**发送方**[发起TraceIPC](#发起traceipc)。
- 在**接收方**[应答TraceIPC](#应答traceipc)。

#### 发起TraceIPC

---

**发送方**使用```Core.ClusterCore.sendDataWithTraceCallBack()```向目标进程发起**TraceIPC**。

**ClusterCore**将在**发送方**发起**TraceIPC**时执行三个操作：

1. 自动生成```traceId```填充至消息结构中以追踪**TraceIPC**链路。
2. 使用步骤①生成的```traceId```在当前进程中注册此次**TraceIPC**收到应答消息时执行的回调。
3. 当接收到的进程间通信消息中包含已被注册的```traceId```时，将在执行此```traceId```对应的回调后删除注册项。

::: tip 说明
对于```traceId```的组成：

- 由24位字符组成。
- 前12位为当前时间戳的16进制表示，位数不足填充```0```。
- 第13-16位为当前进程PID的16进制表示，位数不足填充```0```。
- 第16-24位为随机数，位数不足填充```0```。

**ClusterCore**每次生成```traceId```时，将与当前进程中已注册的```traceId```进行冲突检验，以保证进程级别的唯一性。
:::

#### 应答TraceIPC

---

**接收方**应答**TraceIPC**时需要进行两个步骤：

1. 使用**发送方**消息中的```traceId```构造应答消息结构。

2. 使用```Core.ClusterCore.sendData()```向**发送方**发送应答消息。

::: tip 提示
通常，我们在**接收方**处理进程间通信消息时，使用消息结构中的```action```判断是否需要向**发送方**发送应答消息。
:::

让我们来看一个使用**TraceIPC**的🌰：

```javascript
const Core = require('node-corejs');

/**
 * 实现AppMain
 */
class AppMain extends Core.AppMain {
  /**
   * 进程初始化完成
   * @override
   */
  onProcessDidInit(processId, launchParams) {
    super.onProcessDidInit(processId, launchParams);
    // Master进程 - 创建两个Worker进程
    if (processId === 'M') {
      Core.ClusterCore.fork(2);
    }
    // Worker进程 - 使两个Worker进程进行通信
    else {
      Core.ClusterCore.getAllProcessIds((err, processIds) => {
        if (err || processIds.length !== 3) {
          return;
        }
        const toProcessId = processIds[1];
        const fromProcessId = processIds[2];
        // 发起TraceIPC
        this.processId === fromProcessId && Core.ClusterCore.sendDataWithTraceCallBack(toProcessId, {
          action: 'TEST_TRACE_IPC_ACTION',
          payload: { value: '这是一个🌰' }
        }, (resData) => {
          console.log(`TraceIPC收到了应答消息:[${JSON.stringify(resData)}]`);
        });
      });
    }
  }

  /**
   * 进程确认处理自定义通信消息
   * @override
   */
  onProcessDidReceiveMessage(fromProcessId, data) {
    console.log(`进程[${this.processId}]收到了来自进程[${fromProcessId}]的消息:[${JSON.stringify(data)}]`);
    const { action, traceId, payload } = data;
    if (action === 'TEST_TRACE_IPC_ACTION') {
      // 应答TraceIPC
      const { value } = payload;
      const resData = {
        traceId,
        action: 'TEST_TRACE_IPC_RES_ACTION',
        payload: { value: value + '🌰' }
      };
      Core.ClusterCore.sendData(fromProcessId, resData);
    }
  }
}

// 使用AppMain初始化ClusterCore并启动
Core.ClusterCore.init(AppMain);
Core.ClusterCore.start();
```

### 消息处理

::: tip 说明
本章中使用的宏变量存储在```Core.Macros```中。
:::

当收到进程间通信消息时，**ClusterCore**将根据进程间通信消息结构中的```action```识别**内部通信消息**和**自定义通信消息**：

- 对于**自定义通信消息**，**ClusterCore**将直接引导其进入**AppMain**中进行**消息处理**。

- 对于**内部通信消息**，**ClusterCore**将仅执行内部处理，不再引导其进入**AppMain**中进行**消息处理**。

::: warning 注意
在**发送方**中收到的**TraceIPC**应答消息也不会进入**AppMain**中的消息处理流程。

因此，我们需要在```traceCallBack```中对这种类型的消息进行处理。
:::

---

当消息结构中的```action```指定为以下宏变量时，将被**ClusterCore**认为是**内部通信消息**，这些消息不会进入：

| 宏变量                                                               | 描述                                          |
| :------------------------------------------------------------------ | :------------------------------------------- |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_GET_INITIAL_INFO```     | Worker进程向Master进程发起获取初始化信息          |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_GET_INITIAL_INFO```     | Master进程向Worker进程应答初始化信息             |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_SET_GLOBAL_OBJECT```    | Worker进程向Master进程发起设置全局对象           |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_SET_GLOBAL_OBJECT```    | Master进程向Worker进程应答设置全局对象执行结果     |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_GET_GLOBAL_OBJECT```    | Worker进程向Master进程发起获取全局对象           |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_GET_GLOBAL_OBJECT```    | Master进程向Worker进程应答获取全局对象执行结果     |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_REMOVE_GLOBAL_OBJECT``` | Worker进程向Master进程发起删除全局对象           |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_REMOVE_GLOBAL_OBJECT``` | Master进程向Worker进程应答删除全局对象执行结果     |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_GET_ALL_PROCESS_IDS```  | Worker进程向Master进程发起获取进程组内的所有进程ID |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_GET_ALL_PROCESS_IDS```  | Master进程向Worker进程应答进程组内所有进程ID      |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_TRANSIT_RESULT```       | Master进程向Worker进程应答通信消息转发结果        |

---

我们可以在实现**AppMain**时，重写消息处理的相关生命周期方法以定制进程间通信消息的处理流程：

#### ```onProcessWillReceiveMessage()```

##### 触发场景

当前进程接收到进程间通信消息时触发此生命周期方法。

##### 使用方法

通常，我们在此方法中使用流程控制函数```next()```对进程间通信消息进行过滤：

- **执行```next()```**：放行进程间通信消息，进入消息实际处理阶段。此时，**ClusterCore**将分发来自**发送方**的原始消息进入```onProcessDidReceiveMessage()```继续处理。

- **执行```next(data)```**：放行进程间通信消息，使用新的消息结构进入实际处理阶段。**ClusterCore**将分发```next()```带入的自定义消息```data```进入```onProcessDidReceiveMessage()```继续处理。

- **执行```next('discard')```、```next(null)```、```next(undefined)```**：拦截进程间通信消息，进入消息舍弃处理阶段。**ClusterCore**将分发来自**发送方**的原始消息进入```onProcessDidDiscardMessage()```执行舍弃处理。

::: tip 提示
如果在实现**AppMain**时没有重写此生命周期方法，则默认执行```next()```放行进程间通信消息。
:::

---

#### ```onProcessDidReceiveMessage()```

##### 触发场景

当前进程中进程间通信消息在确认阶段被放行时触发。

##### 使用方法

通常，我们在此生命周期方法中根据消息结构中指定的```action```执行实际触发的业务逻辑，比如：[应答TraceIPC](#应答traceipc)等。

---

#### ```onProcessDidDiscardMessage()```


##### 触发场景

当前进程中进程间通信消息在确认阶段被舍弃时触发。

##### 使用方法

通常，我们在此生命周期方法中统一处理被舍弃的进程间通信消息。


## 全局对象

我们已经知道，在多进程架构的应用程序中，不同的进程拥有完全独立的内存空间，进程内的状态完全隔离。因此，Corejs提供了在多个**Worker进程**中共享的状态的能力，即：**全局对象**。

::: warning 注意
**全局对象**仅限于在单个应用程序中的多个进程之间共享数据，无法取代分布式协调工具，比如：```ZooKeeper```、```Redis```等。
:::

### API设计

在实现细节上，**全局对象**是一个存储在**Master进程**中的```Object```，**Worker进程**通过[进程间通信](#进程间通信)向**Master进程**发起读写指令以实现对**全局对象**的访问。

**ClusterCore**提供了对**全局对象**进行简单读写操作的API：

- [```getGlobalObject([keyPath], callBack)```](#getglobalobject)：读取**全局对象**中指定键名或键路径对应的值。

- [```setGlobalObject(keyPath[, value][, callBack])```](#setglobalobject)：设置/更新**全局对象**中指定键名或键路径指向的```field```。

- [```removeGlobalObject(keyPath[, callBack])```](#removeglobalobject)：移除**全局对象**中指定键名或键路径指向的```field```。

---

#### ```getGlobalObject()```

##### 使用说明

我们可以使用```getGlobalObject()```读取整个**全局对象**，或读取**全局对象**中指定键名/键路径对应的值。

##### 参数列表

- ```keyPath```：期望读取的键名或键路径，非必填项。指定键路径时，使用键名链路字符串构成的```Array```即可。
  > 当此项未指定或指定为```null```、```undefined```、```NaN```、```''```、```[]```、```{}```时将读取整个**全局对象**。

  ::: tip 提示
  尝试读取**全局对象**时，如果键路径中存在键名指向的```field```不存在或指向的值不为引用类型，则将在```callBack```中得到一个异常。
  :::

- ```callBack```：读取**全局对象**的执行结果，必填项，是一个cps风格的```Function```。其参数列表为```(error, value)```：

  - ```error```：读取**全局对象**失败的原因，为```null```时表示读取动作执行成功。
  - ```value```：在**全局对象**中读取到的值，当操作执行失败时为```undefined```。
    > 需要注意的是，对值为引用类型的```field```中不存在的键名进行取值时也将得到```undefined```。

  ::: tip 说明
  在执行```getGlobalObject()```时，即使没有指定```callBack```也不会产生阻塞性异常。
  
  出于性能考虑，在检测到没有指定```calllBack```时将直接退出，不再触发实际读取逻辑。
  :::

---

#### ```setGlobalObject()```

::: tip 提示
本节中使用的宏变量存储在```Core.Macros```中。
:::

##### 使用说明

我们可以使用```setGlobalObject()```设置或更新指定键名或键路径指向的```field```。

另外，我们可以结合[数组指令](#数组指令)快速对**全局对象**中的```Array```进行操作。

##### 参数列表

- ```keyPath```：期望设置或更新的键名或键路径，必填项。指定键路径时，使用键名链路字符串构成的```Array```即可。

  ::: tip 说明
  ```setGlobalObject()```不允许对**全局对象**进行不安全的写入，在执行以下操作时将在```callBack```中得到一个异常：

  - 尝试在不存在的```field```中创建新```field```。
  - 尝试在值为非引用类型的```field```中创建新```field```。
  :::

- ```value```：期望设置/更新的键值或[数组指令](#数组指令)的参数，非必填项。

  ::: tip 说明
  在执行```setGlobalObject()```时，将根据业务层实际使用的参数列表动态生成一个参数```Array```以作为```value```：

  - 当参数列表中最后一个参数为```Function```时，使用业务层实际使用的参数列表中从第二个参数至倒数第二个参数作为```value```。
  - 当参数列表中最后一个参数为非```Function```时，使用参数列表中第二个参数至倒数第一个参数作为```value```。

  ---

  我们已经知道，```value```是一个```Array```，对于```value```的应用于**全局对象**的效果：
  
  - 在指定的```keyPath```中不包含[数组指令](#数组指令)时，将```value.pop()```的值设置至指定的```keyPath```中。
  - 在指定的```keyPath```中使用了[数组指令](#数组指令)时，将```...value```作为**数组指令**的执行参数应用至指定的```keyPath```中。

  需要注意的是，一些无需参数即可执行的**数组指令**可以不传入```value```，比如：

  - ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_POP```
  - ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SHIFT```
  - ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_REVERSE```
  :::

- ```callBack```：设置或更新**全局对象**的执行结果，非必填项，是一个cps风格的```Function```。其参数列表为```(error, detail)```：

  - ```error```：设置或更新**全局对象**失败的原因，为```null```时表示操作执行成功。
  - ```detail```：设置或更新**全局对象**的操作详情，其结构为```{ globalObject, commandResult }```。

  ::: tip 说明
  对于设置或更新**全局对象**的操作详情：

  - ```globalObject```：执行设置或更新操作后的**全局对象**，当设置/更新操作执行失败时为```undefined```。
  - ```commandResult```：**数组指令**的执行结果，当没有使用**数组指令**或设置/更新操作执行失败时为```undefined```。
    > 对空数组使用```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_POP```指令，也将得到```undefined```。
  :::

#### 数组指令

在```setGlobalObject()```时，如果指定的**键路径**对应了```Array```类型的值，我们可以在**键路径**中追加以下**数组指令**以快捷实现数组变异操作：

| 数组指令                                           | 作用                                      |
| :------------------------------------------------ | :--------------------------------------- |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_POP```        | 删除数组尾部的第一个元素，即执行```pop()```   |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_PUSH```       | 向数组尾部追加新元素，即执行```push()```     |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_FILL```       | 数组填充，即执行```fill()```               |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SHIFT```      | 删除数组头部的第一个元素，即执行```shift()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SPLICE```     | 对数组执行铰接操作，即执行```splice()```     |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_UNSHIFT```    | 向数组头部添加新元素，即执行```unshift()```  |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_REVERSE```    | 数组翻转，即执行```reverse()```            |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_COPYWITHIN``` | 数组内部替换，即执行```copywhthin()```      |

#### ```removeGlobalObject()```

##### 使用说明

我们可以使用```removeGlobalObject()```移除指定键名或键路径指向的```field```。

##### 参数列表

- ```keyPath```：期望移除的键名或键路径，必填项。指定键路径时，使用键名链路字符串构成的```Array```即可。

  ::: tip 说明
  ```removeGlobalObject()```将因期望移除的键名或键路径对应的值类型有不同的删除行为：
  
  - 当键名或键路径对应的值为```Array```时，如果期望移除的键名为```Number```，则执行```splice()```移除键名对应位置的元素。
  - 其余场景下，在期望移除的键名所处的**全局对象**上下文中执行```delete```操作。

  如果键路径中存在键名指向的```field```不存在或指向的值不为引用类型，则将在```callBack```中得到一个异常。
  :::

- ```callBack```：**全局对象**移除操作的执行结果，非必填项，是一个cps风格的```Function```。其参数列表为```(error, detail)```：

  - ```error```：**全局对象**移除操作执行失败的原因，为```null```时表示操作执行成功。
  - ```globalObject```：执行移除操作后的**全局对象**，当操作执行失败时为```undefined```。

### 数据一致性

在多进程架构下，对**全局对象**的并发写操作可能会导致数据一致性的问题。为了保证操作的事务性，在**Master进程**中对**全局对象**的写操作将按照触发顺序同步执行。

相关API正在开发，**ClusterCore**将提供在**Master进程**中远程执行代码以操作**全局对象**的能力。
