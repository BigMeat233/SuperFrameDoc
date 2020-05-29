# 多进程架构

## 介绍

Corejs使用**Master/Worker模型**最大化使用CPU资源：

- **Master进程**负责协调进程资源，比如：创建/重启Worker进程、全局状态/行为维护等。
- **Worker进程**负责具体应用业务逻辑处理。

通常，每个应用程序中有唯一的**Master进程**，**Master进程**会创建多个无状态的**Worker进程**。在**Master进程**中的资源或操作将具有应用级别的唯一性。

## 多进程模型

[多进程模型](./test.png)

## AppMain和ClusterCore

Corejs引入[AppMain](#appmain)和[ClusterCore](#clustercore)实现应用的多进程架构。其中：

- **AppMain**是应用生命周期实现的集合，无法主动在业务层调用。
- **ClusterCore**中定义了进程管理、通信等API。

::: tip 说明
[ClusterCore](#clustercore)初始化时需要指定[AppMain](#appmain)。**ClusterCore**在执行```start()```后监视应用程序执行，检测到应用程序进入某个生命周期阶段时，触发**AppMain**中对应的方法。

使用**ClusterCore**的API执行操作时通常无需关注进程类型，API将自动根据当前运行的进程类型产生相应的行为。
:::

推荐仅在**AppMain**外部执行**ClusterCore**的```init()```和```start()```，应用行为全部放入**AppMain**对应的生命周期方法中进行。样例代码中演示了**AppMain**和**ClusterCore**的基本使用方法：

```javascript
const Core = require('node-corejs');

/**
 * 实现AppMain
 */
class AppMain extends Core.AppMain {
  // Master/Worker进程初始化完成
  onProcessDidInit(processId, launchParams) {
    // 必须执行super操作
    super.onProcessDidInit(processId, launchParams);
    // Master进程中执行:创建4个Worker进程
    if (processId === 'M') {
      console.log(`Master进程创建完成`);
      this.clusterCore.fork(4);
    }
    // Worker进程中执行:需要保持无状态设计
    else {
      console.log(`Worker进程创建完成 -> ${processId}`);
    }
  }
}

// 使用AppMain初始化ClusterCore并启动
Core.ClusterCore.init(AppMain);
Core.ClusterCore.start();
```

## AppMain

::: tip 提示
实现**AppMain**时需要继承```Core.AppMain```。
:::

**AppMain**抽象了**应用模型**和**进程模型**，可以通过实现以下方法对应用程序的生命周期进行HOOK：

- ```onProcessDidInit(processId, launchParams)```：Master/Worker进程初始化完成时触发。
- ```onWorkerProcessDidExit(exitedProcessId, exitInfo, reboot)```：Master进程中捕获到Worker进程退出时触发。
- ```onProcessWillReceiveMessage(fromProcessId, data, next)```：Master/Worker进程捕获到IPC消息时触发。
- ```onProcessDidReceiveMessage(fromProcessId, data)```：Master/Worker进程决定处理IPC消息时触发。
- ```onProcessDidDiscardMessage(fromProcessId, data)```：Master/Worker进程决定丢弃IPC消息时触发。

### 内置实例属性

::: warning 注意
```onProcessDidInit()```默认将```processId```和````launchParams```挂载至**AppMain**实例中。实现```onProcessDidInit()```时，如果没有执行```super```操作，则无法在**AppMain**中使用```this.processId```和```this.launchParams```访问进程ID和初始化参数。
:::

- ```clusterCore```：与**AppMain**绑定的[ClusterCore](#clustercore)实例。
- ```processId```：当前进程ID。

  ::: tip 说明
  进程ID组成：

  - Master进程的进程ID：```'M'```。
  - Worker进程的进程ID：```'W:<%进程偏移%>'```。**进程偏移反映了Master进程创建Worker进程的次序，为```>= 1```的整数。**
  :::

- ```launchParams```：进程的初始化参数，与**Master进程**中的```process.argv```。

### 进程初始化与退出

**AppMain**中提供了捕获进程初始化与退出的生命周期方法：

- ```onProcessDidInit()```在Master/Worker进程初始化完成时触发。
- ```onWorkerProcessDidExit()```在Master进程捕获到Worker进程退出时触发。

**对于Master进程：**

在**Master进程**中执行```clusterCore.start()```时将直接触发```onProcessDidInit()```，同时开始监听**Worker进程**退出消息。当**Worker进程**退出时将触发```onWorkerProcessDidExit()```。

::: tip 说明
**```onWorkerProcessDidExit()```仅在Master进程中触发，通过执行```reboot()```或```clusterCore.fork()```重启Worker进程。**

- 使用```fork()```创建进程时，生成的Worker进程将**使用新的进程ID。**
- 使用```reboot()```重启进程时，生成的Worker进程将**复用退出进程的进程ID。**
:::

**对于Worker进程：**

在**Worker进程**中执行```clusterCore.start()```时，[ClusterCore](#clustercore)向**Master进程**发起一次内部TraceIPC获取当前进程的ID和进程初始化参数。当收到**Master进程**应答结果时触发```onProcessDidInit()```。

## ClusterCore

**ClusterCore**中定义了用于进程管理相关的API，使用前需要指定[AppMain](#appmain)完成初始化。

::: tip 提示
**ClusterCore**是进程级别单例，将自动根据当前运行的进程类型产生相应的行为，在业务层使用时通常不需要关注当前运行的进程类型。需要注意的是：

**Master进程中可以使用```fork()```和```shutdown()```进行Worker进程创建或关闭应用，而Worker进程中无权限进行此操作。**
:::

### 初始化与启动

**ClusterCore**在运行时将与[AppMain](#appmain)联动，因此必须指定**AppMain**完成初始化。推荐按照上述[样例代码](#appmain和clustercore)中所述，将应用程序的业务逻辑全部装入**AppMain**中，使用**ClusterCore**启动。

## 进程间通信

进行进程间通信有两种场景：

- 发送方向接收方发送消息，不需要关注接收方对消息的处理结果时使用[IPC](#ipc)。
- 发送方向接收方发送消息，需要接收方应答时使用[TraceIPC](##traceipc)。

因此，**ClusterCore**中根据上述两种场景提供了向进程组任意进程发起进程间通信的API：

- ```sendData(processId, data, callBack)```：发送普通IPC消息。
- ```sendDataWithTraceCallBack(processId, data, traceCallBack, callBack)```：发送TraceIPC消息。

::: tip 提示
发起进程间通信时需要消息**接收方**的进程ID，可以通过调用```clusterCore.getAllProcessIds()```获取进程组中的所有进程ID。

**注意：当发送发与接收方进程ID相同时无法进行发起进程间通信。**
:::

### IPC

对于不需要**接收方**应答的单向进程间通信，直接使用```clusterCore.sendData(processId, data, callBack)```向目标进程发送消息即可。

::: tip 说明
在构造消息体```data```时，必须指定```action```字段标识消息触发的动作。推荐使用```payload```字段标识进程间通信的附属数据，使消息体结构清晰。

**ClusterCore**在处理进程间通信消息时，可能在消息体中填充以下字段：

- ```traceId```
- ```toProcessId```
- ```fromProcessId```
- ```transitTraceId```

**需要特别注意的是：业务层使用这些字段时优先级更高，将覆盖ClusterCore预留值，可能会导致进程间通信逻辑与预期不符。**
:::

样例代码中演示了基础IPC的使用方式：

```javascript
const Core = require('node-corejs');

// 实现AppMain
class AppMain extends Core.AppMain {
  onProcessDidInit(processId, launchParams) {
    super.onProcessDidInit(processId, launchParams);
    // Master进程中 - 创建一个Worker进程
    if (processId === 'M') {
      this.clusterCore.fork(1);
    }
    // Worker进程中 - 向主进程发起IPC
    else {
      this.clusterCore.sendData('M', { action: 'TEST_IPC_ACTION', payload: { value: 'test' } });
    }
  }

  // 打印收到的IPC消息
  onProcessDidReceiveMessage(fromProcessId, data) {
    console.log(`进程[${this.processId}]收到了来自进程[${fromProcessId}]的消息:[${JSON.stringify(data)}]`);
  }
}

// 使用AppMain初始化ClusterCore并启动
Core.ClusterCore.init(AppMain);
Core.ClusterCore.start();
```

### TraceIPC

对于需要**接收方**应答的双向进程间通讯，需要**发送方**和**接收方**在消息处理时进行协作：

- **发送方**[发起TraceIPC](#发起traceipc)
- **接收方**[应答TraceIPC](#应答traceipc)

#### 发起TraceIPC

**发送方**使用```clusterCore.sendDataWithTraceCallBack(processId, data, traceCallBack, callBack)```即可发起TraceIPC，**ClusterCore**发送消息时将在消息体中附加应用级别唯一的```traceId```，并注册收到应答消息时的回调```traceCallBack```。

在**发送方**接收到消息体中```traceId```相同的消息时，认为此消息是接收方的应答消息，将触发对应的应答回调```traceCallBack```。

::: tip 说明
在**发送方**界定应答消息时，仅使用```traceId```判断，不判断消息来源。因此，保证```traceId```在应用程序中的唯一性非常重要：

- 由24位字符组成。
- 前12位为当前时间戳的16进制表示，位数不足填充```0```。
- 第13-16位为当前进程PID的16进制表示，位数不足填充```0```。
- 第16-24位为随机数，位数不足填充```0```。

生成的```traceId```时，将与当前进程中还未被消费的```traceCallBack```对应的```traceId```进行冲突检验，保证```traceId```的唯一性。
:::

#### 应答TraceIPC

**接收方**收到需要应答的进程间通信消息时，取出接收到的消息体中的```traceId```，在构造应答消息体时使用此```traceId```；然后使用```clusterCore.sendData(processId, data, callBack)```发送消息即可。

::: tip 提示
通常情况下，**接收方**使用消息体中的```action```判断是否需要应答消息。
:::

样例代码中演示了TraceIPC的使用方式：

```javascript
const Core = require('node-corejs');

// 实现AppMain
class AppMain extends Core.AppMain {
  onProcessDidInit(processId, launchParams) {
    super.onProcessDidInit(processId, launchParams);
    // Master进程中 - 创建一个Worker进程
    if (processId === 'M') {
      this.clusterCore.fork(1);
    }
    // Worker进程中 - 向主进程发起TraceIPC
    else {
      this.clusterCore.sendDataWithTraceCallBack('M', { action: 'TEST_TRACE_IPC_ACTION', payload: 1 }, (data) => {
        console.log(`进程[${this.processId}]收到了消息答复:[${JSON.stringify(data)}]`);
      });
    }
  }

  // 打印IPC消息
  onProcessDidReceiveMessage(fromProcessId, data) {
    const { action, payload, traceId } = data;
    // 根据action判断消息是否需要应答
    if (action === 'TEST_TRACE_IPC_ACTION') {
      // 应答消息时，将应答的traceId放入消息体
      const ipcData = {
        traceId,
        action: 'TEST_TRACE_IPC_RES_ACTION',
        payload: payload + 1
      };
      this.clusterCore.sendData(fromProcessId, ipcData);
    }
  }
}

// 使用AppMain初始化ClusterCore并启动
Core.ClusterCore.init(AppMain);
Core.ClusterCore.start();
```

### IPC消息处理

Corejs抽象了IPC消息处理模型为**AppMain**中的三个生命周期方法：

- ```onProcessWillReceiveMessage(fromProcessId, data, next)```：当进程收到IPC消息时将触发。

  在此生命周期中使用流程控制函数```next()```决定确认/丢弃IPC消息：

  - **执行```next()```时，表示确认消息处理**，将分发源消息体进入```onProcessDidReceiveMessage()```继续处理。
  - **执行```next(data)```时，表示确认消息处理**，将分发业务层自定义的消息体```data```进入```onProcessDidReceiveMessage()```继续处理。
  - **执行```next('discard')```、```next(null)```、```next(undefined)```时，表示丢弃消息**，将分发源消息体进入```onProcessDidDiscardMessage()```执行丢弃处理。

  **默认行为下，将执行```next()```直接分发源消息体继续处理。**

- ```onProcessDidReceiveMessage(fromProcessId, data)```：当进程决定处理IPC消息时触发，是消息处理链路的末端，将在此生命周期中完成对消息的实际处理。
- ```onProcessDidDiscardMessage(fromProcessId, data)```：当进程决定丢弃IPC消息时触发，是消息处理链路的末端，将在此生命周期中完成对消息的丢弃处理。

## 全局对象维护

在多进程架构下，每个进程都拥有独立的内存区域互不干涉。因此，Corejs提供了在多进程架构下维护共享数据的功能，即：全局对象维护。

### 内置API

- ```removeGlobalObject(keyPath[, callBack])```：移除全局对象中指定的```Key```或```KeyPath```对应的值。
- ```setGlobalObject(keyPath[, value][, callBack])```：设置全局对象中指定的```Key```或```KeyPath```对应的值。
- ```getGlobalObject([keyPath][, sliceRange], callBack)```：获取全局对象中指定的```Key```或```KeyPath```对应的值。

### 数组指令

使用```setGlobalObject()```和```getGlobalObject()```操作全局对象中数组类型的键值时，可以在```KeyPath```中追加**数组指令**实现数组变异。

| 数组指令                                        | 作用                                    | 适用方法                 |
| :--------------------------------------------- | :------------------------------------- | :---------------------- |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_POP```     | 删除数组尾部第一个元素，即执行```pop()```   | ```setGlobalObject()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_PUSH```    | 向数组尾部添加元素，即执行```push()```     | ```setGlobalObject()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SHIFT```   | 删除数组头部第一个元素，即执行```shift()``` | ```setGlobalObject()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SPLICE```  | 对数组执行切分，即执行```splice()```      | ```setGlobalObject()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_UNSHIFT``` | 向数组头部添加元素，即执行```unshift()```  | ```setGlobalObject()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_REVERSE``` | 翻转数组所有元素，即执行```reverse()```    | ```setGlobalObject()``` |
| ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SLICE```   | 对数组执行切片，即执行```reverse()```     | ```getGlobalObject()``` |

::: tip 提示
数组指令可以在```Core.Macros```中获取。
:::

**ClusterCore**会解析业务层传入的```KeyPath```，当```keyPath```键名链路指向的键值为数组类型且最后一个元素是**数组指令**时，此次全局对象操作将执行**数组指令**。此时业务层传入的```value```全部作为数组指令的参数。

### 全局对象读取

使用```clusterCore.getGlobalObject([keyPath][, sliceRange], callBack)```读取全局对象中指定```Key```或```KeyPath```对应的值。

- ```keyPath```：非必填项，期望读取的键名或键路径。

  ::: danger 注意
  尝试对不存在的```Key```或```KeyPath```取值时将在```callBack```中得到一个异常。
  :::

  传入以下值时表示获取整个全局对象：

  - 不传
  - ```null```
  - ```undefined```
  - ```NaN```
  - ```''```
  - ```[]```
  - ```{}```

- ```...sliceRange```：非必填项，当使用```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SLICE```时，作为Javascript数组原生```slice()```的参数。
- ```callBack```：必填项，CPS风格执行回调，参数列表为：

  - ```err```：执行时产生的异常，为```null```时表示读取成功。
  - ```value```：读取结果，当读取失败或键名/键链路不存在时为```undefined```。

  ::: tip 说明
  **在实际使用过程中，即使没有传入```callBack```也不会导致Crash或异常**。出于性能考虑，**ClusterCore**在检测到没有传入```calllBack```的读值操作时不会触发实际读值处理，将直接退出。
  :::

支持向```KeyPath```中追加```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SLICE```执行数组切片读取。使用**数组切片指令**时，**ClusterCore**将执行```slice(...sliceRange)```返回切片结果。

::: tip 🌰

基础场景：

- 全局对象为```{ key1: [0, 1, 2, 3, 4, 5] }```
- 业务层调用```getGlobalObject()```读取全局对象

调用参数：

- 使用```['key1', Core.Macros.CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SLICE]```作为```keyPath```
- 使用```1, 2```作为```sliceRange```
- 使用```(err, value) => {}```作为```callBack```

即执行：
```javascript
getGlobalObject(
  ['key1', Core.Macros.CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_SLICE],
  1, 2,
  (err, value) => {}
);
```

此时，**ClusterCore**将对```key1```对应的键值```[0, 1, 2, 3, 4, 5]```执行```slice(1, 2)```完成数组切片。
:::

### 全局对象设置

使用```clusterCore.setGlobalObject(keyPath[, value][, callBack])```设置全局对象中指定```Key```或```KeyPath```对应的值。

- ```keyPath```：必填项，期望写入的键名或键路径。

  ::: danger 注意
  尝试写入不存在或类型无法写值的```Key```或```KeyPath```时将在```callBack```中得到一个异常。
  :::

- ```...value```：非必填项，期望写入的键值或**数组指令**的参数。

  ::: tip 说明
  **ClusterCore在处理数组指令时将```(...value)```作为执行参数**，指令执行结果在```callBack```中返回。需要注意的是，一些无需参数的数组指令可以不传入```value```，比如：

  - ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_POP```
  - ```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_REVERSE```

  :::

- ```callBack```：非必填项，CPS风格执行回调，参数列表为：

  - ```err```：执行时产生的异常，为```null```时表示读取成功。
  - ```detail```：操作详情，结构为```{ result, globalObject }```。

  ::: tip 说明
  当写值失败时，```detail```的值为```{ result: undefined, globalObject: null }```，其中：

  - ```result```：数组指令的执行结果，当没有使用数组指令或写值失败时为```undefined```。
  - ```globalObject```：执行写值操作后的全局对象，当写值失败时为```undefined```。

  **需要注意的是，对空数组使用```CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_POP```也将导致```result```为```undefined```，需要注意区分。**
  :::

--- 

#### 一个🌰

**基础场景：**

- 全局对象为```{ key1: [] }```
- 业务层调用```setGlobalObject()```设置全局对象

**调用参数：**

- 使用```['key1', Core.Macros.CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_PUSH]```作为```keyPath```
- 使用```'value1', 'value2', 'value3'```作为```value```
- 使用```(err, detail) => {}```作为```callBack```

**即执行：**
```javascript
setGlobalObject(
  ['key1', Core.Macros.CLUSTER_CORE_GLOBAL_OBJECT_ARRAY_PUSH],
  'value1', 'value2', 'value3',
  (err, detail) => {}
);
```

此时，**ClusterCore**将对```key1```对应的键值```[]```执行```push('value1', 'value2', 'value3')```完成数组变异操作。

### 全局对象删除

使用```clusterCore.removeGlobalObject(keyPath[, callBack])```删除全局对象中指定```Key```或```KeyPath```对应的值。

- ```keyPath```：必填项，期望删除的键名或键路径。

  ::: danger 注意
  **ClusterCore**将根据期望删除键值的类型有不同的删除行为：
  
  - 键值为```Array```：对指定```index```执行```splice(index, 1)```操作。
  - 键值为```Object```：对执行的```key```执行```delete```操作。

  **尝试删除不存在或非引用类型的```Key```或```KeyPath```时将在```callBack```中得到一个异常。**
  :::

- ```callBack```：非必填项，CPS风格执行回调，参数列表为：

  - ```err```：执行时产生的异常，为```null```时表示读取成功。
  - ```detail```：操作详情，结构为```{ result, globalObject }```。

  ::: tip 说明
  当删除失败时，```detail```的值为```{ result: undefined, globalObject: null }```，其中：

  - ```result```：数组指令的执行结果，当删除失败时为```undefined```否则为```null```。
  - ```globalObject```：执行删除操作后的全局对象，当删除失败时为```undefined```。
  :::

#### 一个🌰

**基础场景：**

- 全局对象为```{ key1: [0, 1, 2, 3, 4, 5] }```
- 业务层调用```removeGlobalObject()```删除全局对象

**调用参数：**

- 使用```['key1', '0']```作为```keyPath```
- 使用```(err, detail) => {}```作为```callBack```

**即执行：**
```javascript
removeGlobalObject(['key1', '0'], (err, detail) => {});
```

此时，**ClusterCore**将对```key1```对应的键值```[0, 1, 2, 3, 4, 5]```执行```splice(0, 1)```完成数组变异操作。