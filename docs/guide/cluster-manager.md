# 多进程架构

通常，我们使用**Master/Worker进程模型**使应用程序可以最大化使用CPU资源：

- **Master进程**：协调进程资源，比如：创建/重启**Worker进程**、全局状态/行为维护等。

- **Worker进程**：处理实际业务。

在多进程架构的应用程序中，**Master进程**中执行的操作具有应用程序级别的唯一性；而不同的进程拥有完全独立的内存空间，进程内的状态完全隔离。因此，对于在多个**Worker进程**中共享的状态的场景，我们可以使用Corejs提供的[全局对象](#全局对象)实现。

::: warning 注意
在多**Worker进程**的应用程序中，每个**Worker进程**需要严格保证无状态设计，否则可能产生奇怪的问题。
:::

---

Corejs引入了[ClusterCore](#clustercore)和[AppMain](#appmain)以实现应用程序的多进程架构。其中：

- **ClusterCore**：是多进程架构的核心，其中包含进程管理、通讯相关的API。

- **AppMain**：实现应用程序生命周期的各个阶段，将被**ClusterCore**加载和调用。

::: tip 提示
通常，我们应将应用程序的业务逻辑全部装入**AppMain**，在**AppMain**外部只需要：

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

- [```onProcessTraceMessageTimeout(toProcessId, data)```](#onprocesstracemessagetimeout)：**Master/Worker进程**中需要应答的进程间通信超时未接收到应答消息时触发。

::: tip 提示
我们在实现**AppMain**时，需要继承自```Core.AppMain```。
:::

### 实例属性

[ClusterCore](#clustercore)执行初始化时将自动创建**AppMain**实例。因此，在应用程序的任意生命周期中，可以直接使用```this```访问**AppMain**的实例属性：

- ```processId```：当前进程的ID。

  ::: tip 说明
  **Master进程**和**Worker进程**中的```processId```有不同的构成规则：

  - **Master进程**中，进程ID为```'M'```。

  - **Worker进程**中，进程ID为```'W:<%进程偏移%>'```。
  
  **进程偏移**是一个```>= 1```的整数，反映了**Master进程**创建**Worker进程**的时序。
  :::

- ```clusterCore```：创建并加载**AppMain**的[ClusterCore](#clustercore)实例。

- ```launchParams```：进程的初始化参数，即**Master进程**中的```process.argv```。

::: danger 注意
**AppMain的实例属性将在```onProcessDidInit()```的默认行为中被设置。**

因此，我们在重写```onProcessDidInit()```时必须执行```super```操作，以保证**AppMain**中实例属性的正确性。
:::

### 进程生命周期

我们可以在**AppMain**中指定应用程序在进程维度生命周期中的行为：

- **Master进程**、**Worker进程**初始化完成时。

- **Master进程**检测到有**Worker进程**退出时。

::: tip 提示
对于**Master进程**的退出事件，我们可以**Master进程**的业务层中使用```process.on()```。
:::

#### ```onProcessDidInit()```

**Master进程**、**Worker进程**初始化完成时将触发此生命周期方法。通常，我们在此方法中根据```processId```判断当前的进程环境执行不同的逻辑：

- 当前是**Master进程**时，使用```Core.ClusterCore.fork()```创建**Worker进程**，或执行一些在期望在应用程序维度保证唯一性的操作。

- 当前是**Worker进程**时，执行实际业务，比如：启动**ServiceCore**等。

::: tip 提示
在微服务架构中，如果需要在多个应用程序间同步或共享数据，我们可以使用分布式协调工具，比如：```ZooKeeper```、```Redis```等。
:::

#### ```onWorkerProcessDidExit()```

**Master进程**检测到进程组中有**Worker进程**退出时将触发此生命周期方法。我们在此方法中有两种重新拉起**Worker进程**的方式：

- 使用```reboot()```：新的**Worker进程**将复用退出进程的```processId```。

- 使用```Core.ClusterCore.fork()```：新的**Worker进程**将使用进程组内的进程偏移创建```processId```。

#### 实现原理

在**Master进程**中，执行```Core.ClusterCore.start()```将触发**Master进程**的初始化动作：

1. 首先，使用nodejs原生模块```cluster```监听**Worker进程**的退出消息，在**Worker进程**退出时调用```onWorkerProcessDidExit()```通知业务层。

2. 接下来，使用同样方式监听**Worker进程**的通信消息。

3. 最后，调用```onProcessDidInit()```通知业务层**Master进程**已初始化完成。

---

在**Worker进程**中执行```Core.ClusterCore.start()```时，将触发**Worker进程**的初始化动作：

1. 首先，使用```process.on()```监听来自**Master进程**的通信消息。

2. 接下来，向**Master进程**发起[TraceIPC](#traceipc)以获取进程的初始化信息。

3. 最后，在收到**Master进程**应答的初始化信息时调用```onProcessDidInit()```通知业务层**Worker进程**已初始化完成。

## ClusterCore

在设计上，**ClusterCore**是进程级别的单例，在实例化时将自动根据当前运行进程的类型加载对应的API。即使在不同的进程环境中，相同的API在使用体验上完全相同。因此，我们在使用**ClusterCore**时通常无需关注进程类型。

需要注意的是，运行在**Master进程**中的**ClusterCore**拥有**创建Worker进程**和**关闭应用程序**的能力。即运行在**Worker进程**中的**ClusterCore**无法调用以下API：

- ```fork(workerNum)```：创建指定数量的**Worker进程**。

- ```shutdown([exitCode])```：关闭进程组中的所有**Master进程**和**Worker进程**。

---

我们已经知道，**ClusterCore**将自动调用**AppMain**中对应生命周期方法以驱动应用程序的运行。因此，在使用**ClusterCore**前需要指定**AppMain**进行初始化。

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

2. **发送方**向**接收方**发送消息后，需要接收到**接收方**的应答消息后才认为通信完成，即发起[TraceIPC](#traceipc)。

### API设计

**ClusterCore**提供了在进程组中的任意进程间发起[IPC](#ipc)和[TraceIPC](#traceipc)的API：

- [```sendData(processId, data[, callBack])```](#senddata)：用于发起[IPC](#ipc)。

- [```sendDataWithTraceCallBack(processId, data, options[, callBack])```](#senddatawithtracecallback)：用于发起[TraceIPC](#traceipc)。

::: danger 注意
**ClusterCore将拒绝在相同的进程间发起的通信动作。**
:::

---

#### ```sendData()```

##### 使用场景

用于**发送方**向**接收方**发送单向的进程间通信消息，即发起[IPC](#ipc)。

##### 参数列表

- ```processId```：**接收方**的进程ID，必填项。
  
  ::: tip 提示
  我们可以使用```Core.ClusterCore.getAllProcessIds()```获取进程组中的所有进程ID。
  :::

- ```data```：**发送方**向**接收方**发送的自定义数据，必填项。我们将在[消息结构](#消息结构)一节中讨论具体细节。

- ```callBack```：发起进程间通信动作的执行结果，非必填项。是一个cps风格的```Function```，其参数列表为```(error)```。
  
  ::: tip 提示
  我们可以根据```callBack```回调的```error```判断进程间通信是否执行成功：

  - 当执行成功时，```error```的值为```null```。
  - 当执行失败时，```error```的值为通信失败的原因。
  :::

---

#### ```sendDataWithTraceCallBack()```

##### 使用场景

**发送方**向**接收方**发送需要应答的进程间通信消息，即发起[TraceIPC](#traceipc)。

##### 参数列表

- ```processId```：**接收方**的进程ID，必填项。

  ::: tip 提示
  我们可以使用```Core.ClusterCore.getAllProcessIds()```获取进程组中的所有进程ID。
  :::

- ```data```：**发送方**向**接收方**发送的自定义数据，必填项。我们将在[消息结构](#消息结构)一节中讨论具体细节。

- ```options```：进程间通信的配置项，必填项，支持使用```Object```或```Function```类型的配置项。
  
  ::: tip 提示
  **当我们使用```Object```类型的```options```时，其结构为```{ timeout, traceCallBack }```：**

  - ```timeout```：判定应答超时的毫秒数，默认为```10000```。

    > 在指定时间内未收到来自**接收方**应答消息时，将触发**AppMain**中的```onProcessTraceMessageTimeout()```进行消息超时处理。

  - ```traceCallBack```：**发送方**收到应答消息时执行的回调函数，必填项。其参数列表为```(resData, next)```。

    > 我们可以使用```next()```使应答消息进入**AppMain**中的```onProcessDidReceiveMessage()```继续处理。
  
  **当使用```Function```类型的```options```时，将直接应用于```traceCallBack```，且此时```timeout```为```10000```。**
  :::

- ```callBack```：进程间通信的执行结果，非必填项。是一个cps风格的```Function```，其参数列表为```(error)```。

  ::: tip 提示
  我们可以根据```callBack```回调的```error```判断进程间通信是否执行成功：

  - 当执行成功时，```error```的值为```null```。
  - 当执行失败时，```error```的值为通信失败的原因。
  :::

### 消息结构

进程间通信传输的消息将被**ClusterCore**包装为由元数据```meta```和自定义数据```data```构成的```Object```。

元数据```meta```中存储了消息的基本信息，通常不被业务层感知：

- ```traceId```：消息的链路追踪ID。

- ```toProcessId```：**接收方**的进程ID。

- ```fromProcessId```：**发送方**的进程ID。

- ```isRes```：是否为[TraceIPC](#traceipc)的应答消息。

- ```isTransitRes```：是否为转发结果的应答消息。

- ```transitTraceId```：转发结果消息的链路追踪ID。

---

自定义数据```data```由业务层定义，主要用于存储业务功能所需的信息，通常包括**触发动作**和**附属数据**。

我们在进行进程间通信时，必须在自定义数据中指定消息的**触发动作**，即```action```。另外，推荐使用```payload```作为**附属数据**的键名。

通常，进程间通信消息的元数据不向业务层暴露。在以下场景中，**ClusterCore**仅向业务层抛出自定义数据```data```：

- ```onProcessWillReceiveMessage()```中进程收到的进程间通信消息。

- ```onProcessDidReceiveMessage()```中进程决定处理的进程间通信消息。

- ```onProcessDidDiscardMessage()```中进程决定丢弃的进程间通信消息。

- ```onProcessTraceMessageTimeout()```中超时未被应答的进程间通信消息。

- ```sendDataWithTraceCallBack()```中触发```traceCallBack()```时收到的应答消息。

---

我们可以使用```data.getOriginData()```在业务层中取得消息的原始结构以访问元数据，即包含```meta```和```data```的```Object```。

::: tip 说明
在实现原理上，**ClusterCore**接收到进程间通信的消息时，将对消息结构的原始状态进行Deep Copy生成快照，业务层执行```getOriginData()```时将取得此快照。

因此，在业务层中修改自定义数据```data```并不会影响消息的原始结构。
:::

另外，业务层中的自定义数据```data```可以使用```getTraceDetail()```获取消息的链路追踪信息，用于应答[TraceIPC](#traceipc)。

执行```data.getTraceDetail()```将得到结构为```{ traceId, responsive, resTrace }```的```Object```，其中：

- ```traceId```：消息的链路追踪ID。

- ```responsive```：消息是否可应答。

- ```resTrace```：消息的快捷应答方法，其参数列表为```(data[, callBack])```。

---

::: danger 注意
在进行进程间通信时，我们通常仅需指定消息的自定义数据，即```data```。

为避免nodejs在进程间通信过程中自动执行的序列化对消息的完整性产生影响，我们应使用基本类型组成```data```：

- ```Array```
- ```Object```
- ```Number```
- ```String```
- ```Boolean```
:::

### IPC

对于无需关注**接收方**应答的单向进程间通信，使用```sendData()```直接向目标进程发送消息即可。

让我们来看一个单向进程间通信的🌰：

```javascript
const Core = require('node-corejs');

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
    // Worker进程 - 在两个Worker进程间进行通信
    else {
      Core.ClusterCore.getAllProcessIds((err, processIds) => {
        if (err || processIds.length !== 3) {
          return;
        }
        const toProcessId = processIds[1];
        const fromProcessId = processIds[2];
        this.processId === fromProcessId && Core.ClusterCore.sendData(toProcessId, {
          // 设置消息的触发动作
          action: 'TEST_IPC_ACTION',
          // 设置消息的附属数据
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
    console.log(`进程[${this.processId}]处理来自进程[${fromProcessId}]的消息:[${JSON.stringify(data)}]`);
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

**发送方**使用```sendDataWithTraceCallBack()```向目标进程发起**TraceIPC**。

**ClusterCore**将在**发送方**发起**TraceIPC**时执行三个操作：

1. 生成```traceId```填充至元数据```meta```中以追踪**TraceIPC**链路。

2. 使用步骤①中生成的```traceId```在当前进程中注册此次**TraceIPC**的追踪信息。

   > 即：消息**接收方**的进程ID和收到应答消息时执行的回调函数```traceCallBack```。

3. 当接收到的消息元数据中包含已被注册的```traceId```且来源方与注册信息匹配时，认为此消息为**TraceIPC**的应答消息。

   > 此时将分发消息进入与```traceId```对应的```traceCallBack```并注销其注册状态。

::: tip 提示
我们可以在发起**TraceIPC**时指定判定应答超时的时间，当**发送方**在指定时间内未收到来自**接收方**的应答消息时，将自动注销此次**TraceIPC**使用的```traceId```对应的注册信息并触发**AppMain**中的```onProcessTraceMessageTimeout()```以对超时消息进行处理。

另外，在**TraceIPC**超时后，如果收到了应答消息将直接触发**AppMain**中的```onProcessDidDiscardMessage()```进行舍弃处理。
:::

对于```traceId```的结构：

- 由24位字符组成。
- 前12位为当前时间戳的16进制表示，位数不足填充```0```。
- 第13-16位为当前进程PID的16进制表示，位数不足填充```0```。
- 第16-24位为随机数，位数不足填充```0```。

**ClusterCore**每次生成```traceId```时，将与当前进程中已注册的```traceId```进行冲突检验，以保证其进程级别的唯一性。

#### 应答TraceIPC

---

**接收方**应答**TraceIPC**时需要进行两个步骤：

1. 执行```getTraceDetail()```取得消息的链路追踪信息。

2. 使用链路追踪信息中提供的```resTrace()```向发送应答消息。

::: tip 提示
通常，我们在**接收方**处理进程间通信消息时，使用消息的**触发动作**判断是否需要向**发送方**发送应答消息。

需要注意的是，应答**TraceIPC**时仅允许应答一次，链路追踪信息中的```responsive```表示是否允许进行应答。
:::

让我们来看一个使用**TraceIPC**的🌰：

```javascript
const Core = require('node-corejs');

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
    // Worker进程 - 在两个Worker进程间进行通信
    else {
      Core.ClusterCore.getAllProcessIds((err, processIds) => {
        if (err || processIds.length !== 3) {
          return;
        }
        const toProcessId = processIds[1];
        const fromProcessId = processIds[2];
        // 发起TraceIPC
        this.processId === fromProcessId && Core.ClusterCore.sendDataWithTraceCallBack(toProcessId, {
          // 设置消息的触发动作
          action: 'TEST_TRACE_IPC_ACTION',
          // 设置消息的附属数据
          payload: { value: '这是一个🌰' }
        }, (resData, next) => {
          console.log(`TraceIPC收到了应答消息:[${JSON.stringify(resData)}]`);
          // 使用next()分发应答消息进入AppMain中的确认处理
          next();
        });
      });
    }
  }

  /**
   * 进程确认处理自定义通信消息
   * @override
   */
  onProcessDidReceiveMessage(fromProcessId, data) {
    console.log(`进程[${this.processId}]处理来自进程[${fromProcessId}]的消息:[${JSON.stringify(data)}]`);
    const { action, payload } = data;
    // 使用action判断是否需要应答
    if (action === 'TEST_TRACE_IPC_ACTION') {
      const { value } = payload;
      // 获取链路追踪信息
      const { responsive, resTrace } = data.getTraceDetail();
      // 发送应答消息
      const resData = {
        action: 'TEST_TRACE_IPC_RES_ACTION',
        payload: { value: value + '🌰' }
      };
      responsive && resTrace(resData);
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

在收到进程间通信消息时，**ClusterCore**将根据进程间通信消息自定义数据中的```action```对**内部通信消息**和**自定义通信消息**进行预分类：

- 对于**自定义通信消息**，将直接进入**AppMain**中进行消息处理。

- 对于**内部通信消息**，将仅执行内部处理，不再进入**AppMain**中的消息处理流程。

---

进程间通信消息自定义数据中的```action```指定为以下宏变量时，将被**ClusterCore**认为是**内部通信消息**，此类消息不会进入**AppMain**中的消息处理流程：

| 宏变量                                                               | 描述                                           |
| :------------------------------------------------------------------ | :-------------------------------------------- |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_GET_INITIAL_INFO```     | Worker进程向Master进程发起获取初始化信息           |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_GET_INITIAL_INFO```     | Master进程向Worker进程应答初始化信息              |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_SET_GLOBAL_OBJECT```    | Worker进程向Master进程发起设置全局对象             |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_SET_GLOBAL_OBJECT```    | Master进程向Worker进程应答设置全局对象执行结果      |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_GET_GLOBAL_OBJECT```    | Worker进程向Master进程发起获取全局对象             |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_GET_GLOBAL_OBJECT```    | Master进程向Worker进程应答获取全局对象执行结果      |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_REMOVE_GLOBAL_OBJECT``` | Worker进程向Master进程发起删除全局对象             |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_REMOVE_GLOBAL_OBJECT``` | Master进程向Worker进程应答删除全局对象执行结果      |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_GET_ALL_PROCESS_IDS```  | Worker进程向Master进程发起获取进程组内的所有进程ID  |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_GET_ALL_PROCESS_IDS```  | Master进程向Worker进程应答进程组内所有进程ID       |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_QUERY_GLOBAL_OBJECT```  | Worker进程向Master进程发起自定义读取全局对象        |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_QUERY_GLOBAL_OBJECT```  | Master进程向Worker进程应答自定义读取全局对象执行结果 |
| ```CLUSTER_CORE_WORKER_TO_MASTER_ACTION_REQ_UPDATE_GLOBAL_OBJECT``` | Worker进程向Master进程发起自定义更新全局对象        |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_UPDATE_GLOBAL_OBJECT``` | Master进程向Worker进程应答自定义更新全局对象执行结果 |
| ```CLUSTER_CORE_MASTER_TO_WORKER_ACTION_RES_TRANSIT_RESULT```       | Master进程向Worker进程应答通信消息转发结果         |

---

我们可以重写**AppMain**中消息处理相关的生命周期方法，以定制进程间通信消息的处理流程：

#### ```onProcessWillReceiveMessage()```

##### 触发场景

当前进程接收到**自定义通信消息**时触发此生命周期方法。

##### 使用方式

通常，我们在此生命周期方法中对进程间通信消息进行分流，使用流程控制函数```next()```决定放行或舍弃收到的消息。

- 执行```next()```：放行进程间通信消息进入下一处理阶段。此时，**ClusterCore**将分发来自**发送方**源消息的自定义数据```data```进入```onProcessDidReceiveMessage()```继续处理。

- 执行```next(data)```：放行进程间通信消息，使用新消息进入下一处理阶段。**ClusterCore**将使用```next()```带入的```data```覆盖源消息的自定义数据```data```中的```payload```并进入```onProcessDidReceiveMessage()```继续处理。

- 执行```next(CLUSTER_CORE_MESSAGE_COMMAND_DISCARD)```：舍弃进程间通信消息，进入消息舍弃处理阶段。**ClusterCore**将分发来自**发送方**源消息的自定义数据```data```进入```onProcessDidDiscardMessage()```执行舍弃处理。

::: tip 提示
如果在实现**AppMain**时没有重写此生命周期方法，将默认执行```next()```分发源消息的自定义数据进入```onProcessDidReceiveMessage()```。
:::

---

#### ```onProcessDidReceiveMessage()```

##### 触发场景

- 当前进程中收到的**自定义通信消息**在分流阶段被放行时触发。
- 当前进程中收到的应答消息触发的```traceCallBack()```中执行了```next()```时触发。

##### 使用方式

通常，我们在此生命周期方法中完成对消息触发的实际业务逻辑的处理，比如：[应答TraceIPC](#应答traceipc)等。

---

#### ```onProcessDidDiscardMessage()```


##### 触发场景

- 当前进程中收到的**自定义通信消息**在分流阶段被舍弃时触发。
- 当前进程中在**TraceIPC**超时后收到了应答消息时触发。

##### 使用方式

通常，我们在此生命周期方法中统一处理被舍弃的进程间通信消息。

---

#### ```onProcessTraceMessageTimeout()```

##### 触发场景

当前进程发起**TraceIPC**，在指定时间内未收到**接收方**应答时触发。

##### 使用方式

通常，我们在此生命周期方法中统一处理超时的**TraceIPC**消息，比如：重新尝试发起**TraceIPC**等。

## 全局对象

我们已经知道，在多进程架构的应用程序中，不同的进程拥有完全独立的内存空间，进程内的状态完全隔离。因此，Corejs提供了在进程组中共享状态的能力，即：**全局对象**。

::: warning 注意
**全局对象**仅限于在单个应用程序中的多个进程之间共享数据，无法取代分布式协调工具，比如：```ZooKeeper```、```Redis```等。
:::

### API设计

在实现细节上，**全局对象**是一个存储在**Master进程**中的```Object```，**Worker进程**通过[进程间通信](#进程间通信)向**Master进程**发起读写指令以实现对**全局对象**的访问。

::: tip 提示
因此，**全局对象**中值的类型受制于进程间通信时nodejs自动执行序列化的影响。

为避免序列化造成的问题，我们设置全局对象时同样应使用基本类型构成的```field```，即：

- ```Array```
- ```Object```
- ```Number```
- ```String```
- ```Boolean```
:::


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

在```setGlobalObject()```时，如果指定的**键路径**对应了**全局对象**中的值为```Array```类型，我们可以在**键路径**中追加以下**数组指令**以快捷实现数组变异操作：

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

在多进程架构下，对**全局对象**的并发操作可能会导致数据一致性问题。为保证操作**全局对象**的事务性，**ClusterCore**提供了对**全局对象**进行自定义事务操作的API：

- [```queryGlobalObject([context,] [queryFn,] callBack)```](#)：自定义读取**全局对象**。

- [```updateGlobalObject([context,] updateFn[, callBack])```](#)：自定义更新**全局对象**。

::: danger 注意
**自定义读取/更新全局对象的API在Master进程中使用Sandbox严格同步执行代码片段的方式以保证全局对象在同一时刻仅被一个操作访问。**

因此，操作规则```queryFn```和```updateFn```中**不允许执行异步逻辑**也**无法访问外部变量**，我们可以通过```context```将外部资源植入Sandbox。

需要注意的是，```context```受制于进程间通信时nodejs自动执行序列化的影响，应使用基本类型构成，即：

- ```Array```
- ```Object```
- ```Number```
- ```String```
- ```Boolean```
:::

#### ```queryGlobalObject()```

##### 使用说明

在自定义读取**全局对象**时，我们可以使用以下方式：

- ```queryGlobalObject(callBack)```：适用于直接读取整个**全局对象**的场景。

- ```queryGlobalObject(queryFn, callBack)```：适用于使用不访问任何外部资源的自定义规则读取**全局对象**的场景。

- ```queryGlobalObject(context, queryFn, callBack)```：适用于使用依赖外部资源的自定义规则读取**全局对象**的场景。

##### 参数列表

- ```context```：应用于读取规则的资源上下文，非必填项。

- ```queryFn```：**全局对象**的自定义读取规则，非必填项，是一个```Function```。其参数列表为```(globalObject, context)```：

  - ```globalObject```：执行读取操作时应用程序中**全局对象**的快照。
  - ```context```：外部资源上下文。当执行自定义读取操作未指定资源上下文时，则此值为```undefined```。

  ::: danger 注意
  **ClusterCore**将在未指定自定义读取规则```queryFn```时返回整个**全局对象**。另外，```queryFn```中**不允许执行异步逻辑**也**无法访问外部变量**。

  通常，我们在```queryFn```中根据外部依赖资源```context```对```globalObject```进行解析和计算，并将期望的数据结构使用```return```指令返回。
  :::

- ```callBack```：自定义读取**全局对象**的执行结果，必填项，是一个cps风格的```Function```。其参数列表为```(error, value)```：

  - ```error```：自定义读取**全局对象**失败的原因，为```null```时表示读取动作执行成功。
  - ```value```：自定义读取规则的返回值，即```queryFn```中```return```的结果，当操作执行失败时为```undefined```。

  ::: tip 说明
  在执行```queryGlobalObject()```时，即使没有指定```callBack```也不会产生阻塞性异常。
  
  出于性能考虑，在检测到没有指定```calllBack```时将直接退出，不再触发实际读取逻辑。
  :::

#### ```updateGlobalObject()```

##### 使用说明

在自定义更新**全局对象**时，我们可以使用以下方式：

- ```updateGlobalObject(updateFn)```：适用于直接更新**全局对象**不关注执行结果的场景。

- ```updateGlobalObject(context, updateFn)```：适用于使用依赖外部资源的自定义规则更新**全局对象**但不关注执行结果的场景。

- ```updateGlobalObject(context, updateFn, callBack)```：适用于使用依赖外部资源的自定义规则更新**全局对象**的场景。

##### 参数列表

- ```context```：应用于更新规则的资源上下文，非必填项。

- ```updateFn```：**全局对象**的自定义更新规则，必填项，是一个```Function```。其参数列表为```(globalObject, context)```：

  - ```globalObject```：执行更新操作时应用程序中**全局对象**的快照。
  - ```context```：外部资源上下文。当执行自定义更新操作未指定资源上下文时，则此值为```undefined```。

  ::: tip 提示
  自定义更新规则```updateFn```中**不允许执行异步逻辑**也**无法访问外部变量**。**ClusterCore**将使用```Object.assign()```将```updateFn```的执行结果应用至**全局对象**。

  通常，我们在```updateFn```中根据外部依赖资源```context```和当前```globalObject```完成解析和计算，并通过使用```Spread```等操作符重组新的**全局对象**使用```return```指令返回。
  :::

- ```callBack```：自定义更新**全局对象**的执行结果，非必填项，是一个cps风格的```Function```。其参数列表为```(error, globalObject)```：

  - ```error```：自定义更新**全局对象**失败的原因，为```null```时表示更新动作执行成功。
  - ```globalObject```：自定义更新操作执行成功后的**全局对象**，当操作执行失败时为```undefined```。
