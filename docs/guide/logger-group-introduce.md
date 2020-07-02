# 日志输出组

**日志输出组**提供了将一个或多个[日志输出器](/guide/logger-introduce)进行组合的能力。在本章中，我们将对**日志输出组**的使用方式进行讨论。

我们已经知道，**日志输出组**无法通过实例化直接创建实例，而是依赖[LoggerCore](#loggercore)执行```createGroupLogger()```生成**日志输出组**实例。

::: tip 提示
在设计上，**日志输出组**使用了典型的工厂模式，即[LoggerCore](#loggercore)是生产**日志输出组**的工厂。

因此，我们在使用**日志输出组**进行组合日志输出需要两个步骤：

- 将需要组合的[日志输出器](/guide/logger-introduce)组成**LoggerCore**的配置参数创建**LoggerCore**实例。

- 使用**LoggerCore**实例执行```createGroupLogger()```并传入期望的**日志输出组**类型和配置参数，即可得到对应的**日志输出组**实例。
:::

## 行为控制

我们无法直接触发**日志输出组**组合的[日志输出器](/guide/logger-introduce)的构建、启动和关闭。而是在实例化[LoggerCore](#loggercore)使用的配置参数中指定这些动作的触发方式，使**LoggerCore**和**日志输出组**在恰当的时间点自动执行这些动作。

### 输出器构建

我们可以在[LoggerCore](#loggercore)配置参数中指定每个[日志输出器](/guide/logger-introduce)的```buildTrigger```以控制何时创建这些**日志输出器**的实例：

- **```init```**：在**LoggerCore**实例化时触发**日志输出器**的构建动作。通常，持续型输出器使用此方式触发构建，比如：[日期输出器](/guide/logger-introduce.html#日期输出器)。

- **```create```**：在**日志输出组**实例化时触发**日志输出器**的构建动作，即：**LoggerCore**实例执行```createGroupLogger()```时。通常，临时型输出器使用此方式触发构建，比如：[文件输出器](/guide/logger-introduce.html#文件输出器)。

::: tip 提示

原则上，**LoggerCore**实例化动作仅执行一次。因此，我们可以将期望被**LoggerCore**创建的所有**日志输出组**实例共享的**日志输出器**使用```init```方式触发构建。

比如在一些频次型业务中，我们可能希望将每次业务执行时的基础信息通过相同的**日志输出器**进行收集，而每次业务执行链路产生的日志使用不同的**日志输出器**收集。此时，我们可以：

- 指定**日志输出组**共享的**日志输出器**使用```init```方式触发构建。

- 指定**日志输出组**非共享的**日志输出器**使用```create```方式触发构建。

- 每次业务执行时，使用**LoggerCore**实例执行```createGroupLogger()```创建新的**日志输出组**实例用于链路中的日志收集。

:::

### 输出器启动

同样，我们可以在[LoggerCore](#loggercore)配置参数中指定每个[日志输出器](/guide/logger-introduce)的```startTrigger```以控制何时启动这些**日志输出器**的实例：

- **```none```**：**LoggerCore**和**日志输出组**不执**日志输出器**的启动动作。通常，支持自动启动的输出器使用此方式触发启动，比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。

- **```normal```**：在**日志输出组**实例执行```start()```时触发**日志输出器**的启动动作，即：**日志输出器**伴随**日志输出组**启动。通常，不支持自动启动的输出器使用此方式触发启动，比如：手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。
  
### 输出器关闭

同样，我们可以在[LoggerCore](#loggercore)配置参数中指定每个[日志输出器](/guide/logger-introduce)的```closeTrigger```以控制何时关闭这些**日志输出器**的实例：

- **```none```**：**LoggerCore**和**日志输出组**不执**日志输出器**的关闭动作。通常，支持自动关闭的输出器使用此方式触发关闭，比如：自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。

- **```normal```**：在**日志输出组**实例执行```close()```时触发**日志输出器**的关闭动作，即：**日志输出器**伴随**日志输出组**关闭。通常，不支持自动关闭的输出器使用此方式触发关闭，比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。

## LoggerCore

我们已经知道，**LoggerCore**是生产**日志输出组**的工厂。

通常，我们把**LoggerCore**实例在相同的日志收集场景中共享。在业务执行时，使用```createGroupLogger()```创建**日志输出组**实例用于跟踪业务链路中产生的日志。

---

**LoggerCore**实例创建**日志输出组**实例实际上执行了两个动作：

1. **LoggerCore**实例根据实例化时应用的配置参数，创建需要组合的[日志输出器](/guide/logger-introduce)实例并组成待植入**日志输出组**实例的**日志输出器实例列表**。

2. 实例化执行```createGroupLogger()```时指定的**日志输出组**，得到对应的**日志输出组**实例。**日志输出组**实例化时会应用①中构造的**日志输出器实例列表**。

::: tip 说明

**日志输出器实例列表**中的元素其实并不仅仅是**日志输出器**实例本身，而是一个包含了**日志输出器**的行为触发方式的```Object```，其结构为：

- **```logger```**：**日志输出器**实例。

- **```startTrigger```**：**日志输出器**的启动触发方式。

- **```closeTrigger```**：**日志输出器**的关闭触发方式。

**日志输出组**将根据**行为触发方式**在恰当的时间点执行**日志输出器**实例的相关动作。

:::

### 配置说明

通常，实例化**LoggerCore**需要使用由**LoggerCore标识ID**、**输出器基础配置**和**输出器配置列表**构成的配置对象，即：```{ id, env, level, params, loggers }```。

- ```id```：**LoggerCore**的唯一标识，默认值为``` `LoggerCore_${generateRandomString(6, 'uln')}` ```。

::: tip 提示
我们可以通过唯一的```id```在应用程序中标识**LoggerCore**实例。

在实际日志收集场景中使用共享的**LoggerCore**实例时可以通过执行```loggerCore.id```对**LoggerCore**实例进行校验和判断。
:::

- ```env```：**LoggerCore**的运行环境/**日志输出器**的基础运行环境，默认值为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```。

  需要注意的是，**运行环境**将影响**LoggerCore**的行为：

  - 当运行环境为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，**LoggerCore**创建**日志输出器**实例时将忽略配置对象中指定的**输出器配置列表**。

  - 当运行环境不为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，**LoggerCore**创建**日志输出器**实例时将应用配置对象中实际指定的**输出器配置列表**。
  
  ::: tip 说明
  当运行环境为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，**LoggerCore**将不再使用配置对象中指定的**输出器配置列表**创建**日志输出器**实例，而是使用一个[基础输出器](/guide/logger-introduce.html#基础输出器)将日志单点输出至控制台，其触发方式为：

  - **构建触发方式**：```init```。

  - **启动触发方式**：```none```。

  - **关闭触发方式**：```none```。
  :::
  ---

  另外，此配置将作为在**输出器配置列表**中指定**日志输出器**的```env```的默认值：

  - 未指定**日志输出器**的```env```时，使用此配置。

  - 指定了**日志输出器**的```env```时，使用实际配置。

- ```level```：**日志输出器**的基础最小日志输出等级的名称或别名。

  同样，此配置的默认值依赖于当前**LoggerCore**的**运行环境**：

  - 当运行环境为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```all```。

  - 当运行环境不为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```error```。

  另外，此配置将作为在**输出器配置列表**中指定**日志输出器**的```level```的默认值：

  - 未指定**日志输出器**的```level```时，使用此配置。

  - 指定了**日志输出器**的```level```时，使用实际配置。

- ```params```：**日志输出器**的基础功能配置参数。

  ::: tip 说明
  **LoggerCore**在创建**日志输出器**实例时，默认将通过```Object.assign()```将个性化功能配置参数合并至基础功能配置参数中形成最终应用于**日志输出器**实例的功能配置参数。

  我们可以通过修改**LoggerCore**实例的```onBuildLogger```属性进行更改以变更默认的**日志输出器**创建行为，具体将在[运行原理](#运行原理)一节中讨论。
  :::

- ```loggers```：**日志输出器**的配置列表，其元素结构为：```{ type, buildTrigger, startTrigger, closeTrigger, env, level, params }```。

  - ```type```：**日志输出器**的类型，可以使用Corejs内置的**日志输出器**或[自定义输出器](/guide/logger-customizing.html)，默认值为```null```。
    
    ::: warning 注意
    **LoggerCore**创建**日志输出器**实例时将对使用的```type```进行校验。如果指定了未继承自```Core.BaseLogger```的**自定义输出器**时，将认为**日志输出器**的类型无效，不再执行实际构建动作。
    :::

  - ```buildTrigger```：**日志输出器**的**构建触发方式**，默认值为```'init'```。

  - ```startTrigger```：**日志输出器**的**启动触发方式**，默认值为```'none'```。

  - ```closeTrigger```：**日志输出器**的**关闭触发方式**，默认值为```'none'```。

  ::: tip 提示
  关于**日志输出器**的行为触发方式，我们可以参考[行为控制](#行为控制)一节。
  :::

  - ```env```：**日志输出器**的**运行环境**，默认值为**LoggerCore**的**运行环境**。

  - ```level```：**日志输出器**最小日志输出等级的名称或别名，默认值为**LoggerCore**的最小日志输出等级名称或别名。

  - ```params```：**日志输出器**的功能配置参数。

  ::: tip 提示
  关于**日志输出器**的**运行环境**、**最小输出等级**和**功能配置参数**，我们可以参考**日志输出器**的[功能配置](/guide/logger-introduce.html#输出器配置)一节。
  :::

### 运行原理

我们已经知道，**LoggerCore**实例将在执行```createGroupLogger()```时创建**日志输出组**实例并向其中植入**日志输出器实例列表**。于是，小朋友你是否有很多问号：

- **日志输出器**实例如何创建？

- **日志输出器**实例何时创建？

在本节中，我们将围绕这两个问题讨论**LoggerCore**的运行原理。

---

对于**日志输出器实例如何创建**，答案非常简单：**LoggerCore**将迭代**输出器配置列表**中的每个配置对象，调用实例方法```onBuildLogger()```逐个创建**日志输出器**实例。

```onBuildLogger()```接收三个参数用于创建**日志输出器**实例：

- **```type```**：**日志输出器**的类型。

- **```loggerConfigs```**：在**输出器配置列表**中对指定的配置对象。

- **```defaultConfigs```**：在**LoggerCore**中指定的基础配置对象。

举一个🌰，有这样一个**LoggerCore**：

```javascript
const Core = require('node-corejs');

const loggerCore = new Core.LoggerCore({
  env: 'prod',
  level: 'infos',
  params: { sourcePath: './testlogs' },
  loggers: [{
    type: Core.FileLogger,
    buildTrigger: 'create',
    startTrigger: 'normal',
    closeTrigger: 'normal',
    level: 'error',
    params: { auto: false, filePrefix: 'FileLogger_1' }
  }],
});

```

那么，**LoggerCore**使用```onBuildLogger()```创建**日志输出器**实例时带入的参数为：

```javascript
type = Core.FileLogger;

loggerConfigs = { level: 'error', params: { auto: false, filePrefix: 'FileLogger_1' } };

defaultConfigs = { env: 'prod', level: 'infos', params: { sourcePath: './testlogs' } };
```

接下来，让我们来看一看```onBuildLogger()```的默认实现：

```javascript
onBuildLogger(type, loggerConfigs, defaultConfigs) {
  // 将个性化功能配置应用基础功能配置
  const params = Object.assign({}, defaultConfigs.params, loggerConfigs.params);
  // 将个性化配置应用基础配置并合并功能配置
  const configs = Object.assign({}, defaultConfigs, loggerConfigs, { params });
  // 执行输出器的实例化
  return new type(configs);
}
```

因此，我们可以通过修改**LoggerCore**实例的```onBuildLogger```属性进行更改以变更默认的**日志输出器**创建行为。

```javascript
const Core = require('node-corejs');
const loggerCore = new Core.LoggerCore();
// 必须在createGroupLogger()前修改onBuildLogger()
loggerCore.onBuildLogger = (type, loggerConfigs, defaultConfigs) => new type(loggerConfigs);
// 此时获取到的日志输出组不再应用基础配置
const logger = loggerCore.createGroupLogger();
```

---

对于**日志输出器实例何时创建**，**LoggerCore**将根据在**输出器配置列表**中指定的**构建触发方式**决定创建**日志输出器**实例的时间点。

#### 实例化阶段

1. **LoggerCore**根据**输出器配置列表**中每个配置对象的**构建触发方式**进行分类。

2. **LoggerCore**提取分类结果中使用```init```方式触发构建的配置对象，并使用```onBuildLogger()```创建对应的**日志输出器**实例存储在实例属性```_baseLoggerObjects```中。

#### 执行```createGroupLogger()```

1. **LoggerCore**提取分类结果中使用```create```方式触发构建的配置对象，并使用```onBuildLogger()```创建对应的**日志输出器**实例。

2. 连接**LoggerCore**实例属性```_baseLoggerObjects```中存储的**日志输出器**实例和①中创建的**日志输出器**实例组成待植入**日志输出组**实例的**日志输出器实例列表**。

3. **LoggerCore**根据```createGroupLogger()```传入的**日志输出组类型**和**日志输出组配置参数**，创建对应的**日志输出组**实例并向其植入②中得到的**日志输出器实例列表**。

### 创建输出组

在实现细节上，**日志输出组**继承自[基础输出器](/guide/logger-introduce.html#基础输出器)，本质上是一个**高阶日志输出器**。因此，**日志输出组**支持通过配置对象控制输出行为。

需要注意的是，指定**日志输出组**配置对象中的**运行环境**和**最小输出等级**（即```env```和```level```）通常无实际意义。对于**功能配置参数**```params```，也仅支持以下四个配置项：

- ```_errorHandler```
- ```_checkStateInLog```
- ```_checkStateInStart```
- ```_checkStateInClose```

我们可以在[基础输出器](/guide/logger-introduce.html#基础输出器)的[功能参数](/guide/logger-introduce.html#功能参数)一节中详细了解**功能配置参数**的使用方式。

---

```createGroupLogger()```支持多种调用方式：

- **```createGroupLogger()```**：不指定配置参数创建[基础输出组](#基础输出组)的实例。
- **```createGroupLogger(type)```**：不指定配置参数创建指定的**日志输出组**的实例。
- **```createGroupLogger(configs)```**：使用指定配置参数创建[基础输出组](#基础输出组)的实例。
- **```createGroupLogger(type, configs)```**：使用指定配置参数创建指定的**日志输出组**的实例。

::: warning 注意
```createGroupLogger()```执行过程中将对使用的**日志输出组**类型进行校验。出于保证应用程序的可用性考虑，如果使用了无效的**日志输出组**类型（即：非继承自[基础输出组](#基础输出组)的[自定义输出组](/guide/logger-group-customizing.html)），将默认创建**基础输出组**的实例。

另外，配置参数将直接应用于创建**日志输出组**实例，不会被实例化**LoggerCore**时指定的基础配置影响。
:::

---

接下来，我们使用**LoggerCore**实现一个复杂的组合日志输出场景：

**目标1**：

- 保留最近5个归档日期内的日志。

- 将每秒内产生的日志归档至同一**日志文件**，超出```1KB```时自动分割。

- **日志文件**按照**归档前缀**存储，且**日志文件名**中不展示**归档前缀**。

**目标2**：

- 保留最近10秒内的日志。

- **日志文件名**中展示**归档时间**，但不展示**归档前缀**。

- **日志文件**按照**归档前缀**存储，并将每5秒内产生的**日志文件**归档至同一文件。

```javascript
const Core = require('node-corejs');

// 创建LoggerCore
const loggerCore = new Core.LoggerCore({
  env: 'prod',
  level: 'infos',
  params: {
    // 指定统一的归档源目录
    sourcePath: './testlogs',
  },
  loggers: [{
    // 使用共享的日期输出器实现目标1
    type: Core.DateLogger,
    buildTrigger: 'init',                // 在LoggerCore实例化时创建日期输出器
    startTrigger: 'none',                // 日期输出器自动启动,LoggerCore无需控制其启动动作
    closeTrigger: 'none',
    params: {
      filePrefix: 'Cycle_1s',            // 归档前缀
      keepDateNum: 5,                    // 保留最近5个归档日期
      maxSize: 1024,                     // 最大日志文件体积为1K
      dateFormat: 'YYYY-MM-DD_HH_mm_ss', // 以秒作为归档周期
      filePrefixAsFileName: false,       // 日志文件名不附加归档前缀
      filePrefixAsSourcePath: true,      // 在归档源目录中创建归档前缀目录
    }
  }, {
    // 使用非共享的文件输出器实现目标2
    type: Core.FileLogger,
    buildTrigger: 'create',              // 在执行createGroupLogger()时创建新的文件输出器
    startTrigger: 'none',                // 文件输出器自动启动,LoggerCore无需控制其启动动作
    closeTrigger: 'none',                // 文件输出器自动关闭,LoggerCore无需控制其关闭动作
    params: {
      filePrefix: 'Duration_5s',         // 归档前缀
      keepDateNum: 2,                    // 保留最近2个归档日期，2*5=10秒
      fileName: '_',                     // 归档文件名
      filePrefixAsFileName: false,       // 日志文件名不附加归档前缀
      filePrefixAsSourcePath: true,      // 在归档源目录中创建归档前缀目录
      dateFormat: 'YYYY-MM-DD_HH_mm_ss', // 以秒作为归档周期
      dateAsFileName: true,              // 日志文件名附加归档日期
      dateAsSourcePath: false,           // 不使用归档日期分类日志文件
    }
  }],
});

let logger = null;
// 每五秒创建新的日志输出组
function refreshLogger() {
  logger && logger.close();
  logger = loggerCore.createGroupLogger();
  logger.start();
}
refreshLogger();
setInterval(() => refreshLogger(), 5000);

// 每100ms输出一次日志
setInterval(() => {
  logger.log(new Error('一个🌰日志'));
}, 100);
```

## 基础输出组

**基础输出组**提供了组合**日志输出器**并控制其行为的基本能力。因此，我们在[自定义输出组](/guide/logger-group-customizing.html)时需要继承**基础输出组**。

需要注意的是，在**LoggerCore**实例执行```createGroupLogger()```时，如果指定了无效的**日志输出组**类型将默认创建**基础输出组**的实例。

### 运行原理

**基础输出组**实质上通过[自定义输出器](/guide/logger-customizing.html)的方式实现，我们将围绕定制部分讨论**基础输出组**的运行原理。

#### 构造函数

---

我们已经知道，**LoggerCore**实例使用**日志输出器实例列表**和**配置对象**创建**日志输出组**实例。其实，**日志输出组**实例中还将持有对应的**LoggerCore**实例用于维持派生关系。因此，**构造函数**接收三个参数：

- ```loggerCore```：派生**日志输出组**的**LoggerCore**实例

- ```_loggerObjects```：**日志输出器**的实例列表

- ```configs```：**日志输出组**的配置参数

---

在构造阶段，**日志输出组**执行了三个动作：

1. 将派生**日志输出组**的**LoggerCore**实例存储至实例属性```loggerCore```。

2. 将**日志输出器实例列表**合并至自定义功能配置参数组成应用于**日志输出组**的配置对象。

3. 使用②中得到的配置对象执行```super()```操作完成实例化。

::: tip 提示
在[自定义输出器](/guide/logger-customizing.html)时执行```super()```操作将自动引导构造流程进入初始化阶段。

因此，为了避免执行逻辑混乱，在**构造函数**中仅使用功能配置参数的缓存机制存储**日志输出器实例列表**，而将实际的构造逻辑放在[初始化阶段](#initlogger)。
:::

#### ```initLogger()```

---

**日志输出器实例列表**中的元素其实并不仅仅是**日志输出器**实例本身，而是一个包含了**日志输出器**的行为触发方式的```Object```。**日志输出组**将根据**行为触发方式**控制其组合的**日志输出器**的启动/关闭动作。

因此，出于性能考虑，在初始化阶段中将预先解析**日志输出器实例列表**提取**日志输出器**实例完成时空转换：

- 提取使用```normal```方式触发启动的**日志输出器**实例，存储在实例属性```_needStartLoggers```中。

- 提取使用```normal```方式触发关闭的**日志输出器**实例，存储在实例属性```_needCloseLoggers```中。

- 将所有的**日志输出器**实例存储在实例属性```_loggers```中。

#### ```onStart()```

---

在**日志输出组**的**启动阶段**，不仅需要变更**日志输出组**为启动状态；对于使用```normal```作为启动触发方式的**日志输出器**，还需在此阶段执行启动动作。因此，在**日志输出组**的**启动阶段**将执行：

1. 执行```super.onStart()```尝试变更**日志输出组**的启动状态，如果执行失败则不再执行②。

2. 迭代实例属性```_needStartLoggers```，执行每个**日志输出器**实例的启动逻辑。

::: danger 注意
执行```createGroupLogger()```时指定的```_checkStateInStart```将控制执行```super.onStart()```时是否在变更**日志输出组**启动状态前执行状态校验进而影响**执行结果**。

在**启动阶段**的默认行为下，将通过判断```super.onStart()```的**执行结果**以避免**日志输出器**的启动逻辑多次执行。因此，请谨慎调整```_checkStateInStart```。
:::

#### ```onClose()```

---

与**日志输出组**的**启动阶段**类似，**关闭阶段**不仅需要变更**日志输出组**为关闭状态；对于使用```normal```作为关闭触发方式的**日志输出器**，还需在此阶段关闭。因此，在**日志输出组**的**关闭阶段**也将执行：

1. 执行```super.onClose()```尝试变更**日志输出组**的启动状态，如果执行失败则不再执行②。

2. 迭代实例属性```_needCloseLoggers```，执行每个**日志输出器**实例的关闭逻辑。

::: danger 注意
执行```createGroupLogger()```时指定的```_checkStateInClose```将控制执行```super.onClose()```时是否在变更**日志输出组**启动状态前执行状态校验进而影响**执行结果**。

在**关闭阶段**的默认行为下，将通过判断```super.onClose()```的**执行结果**以避免**日志输出器**的关闭逻辑多次执行。因此，请谨慎调整```_checkStateInClose```。
:::

#### ```onLog()```

**日志输出组**的输出原理是通过控制其组合的**日志输出器**输出日志，**日志输出组**本身并不产生任何日志。因此，**日志输出组**执行输出动作时将执行：

1. 使用```onCheckState(BASE_LOGGER_STATE_TYPE_CAN_LOG)```检测当前状态是否允许日志输出，在**日志输出组**当前状态不允许日志输出时将抛出异常信息且不再执行②。

2. 迭代实例属性```_loggers```，执行每个**日志输出器**实例的```log()```进行日志输出。
