# 日志输出组

::: tip 说明
本章中使用的宏变量存储在```Core.Macros```中。
:::

**日志输出组**提供了将一个或多个[日志输出器](/guide/logger-introduce)进行组合的能力。在本章中，我们将讨论**日志输出组**的使用方式。

我们已经知道，**日志输出组**无法通过实例化直接创建实例，而是依赖[LoggerCore](#loggercore)执行```createGroupLogger()```间接执行实例化。

::: tip 说明
在设计上，**日志输出组**使用了典型的工厂模式，即[LoggerCore](#loggercore)是生产**日志输出组**的工厂。

因此，我们在使用**日志输出组**进行组合日志输出需要：

- 将需要组合的[日志输出器](/guide/logger-introduce)组成**LoggerCore**的配置参数创建**LoggerCore**实例。

- 使用**LoggerCore**实例执行```createGroupLogger()```并传入期望的**日志输出组**类型和配置参数，即可得到对应的**日志输出组**实例。
:::

## 行为控制

在引入了[LoggerCore](#loggercore)和**日志输出组**后，我们无法直接触发**日志输出组**组合的[日志输出器](/guide/logger-introduce)的构建、启动和关闭动作。而是在实例化[LoggerCore](#loggercore)使用的配置参数中指定这些动作的触发方式，使**LoggerCore**和**日志输出组**在恰当的时间点自动执行这些动作以满足日志收集的场景。

### 输出器构建

我们在[LoggerCore](#loggercore)构建时的配置参数中指定每个[日志输出器](/guide/logger-introduce)的```buildTrigger```以控制何时创建这些**日志输出器**的实例：

- **```init```**：在**LoggerCore**实例化时触发**日志输出器**的构建动作。通常，持续型输出器使用此方式触发构建，比如：[日期输出器](/guide/logger-introduce.html#日期输出器)。

- **```create```**：在**日志输出组**实例化时触发**日志输出器**的构建动作，即：**LoggerCore**实例执行```createGroupLogger()```时。通常，临时型输出器使用此方式触发构建，比如：[文件输出器](/guide/logger-introduce.html#文件输出器)。

::: tip 提示

原则上，**LoggerCore**实例化动作仅执行一次。因此，我们可以将期望被**LoggerCore**创建的所有**日志输出组**实例共享的**日志输出器**使用```init```方式触发构建。

比如对一些频次型业务产生的日志进行收集时，我们可能希望将每次业务执行时的基础信息通过相同的**日志输出器**进行收集，而每次业务执行链路产生的日志使用不同的**日志输出器**收集。此时，我们可以：

- 指定**日志输出组**共享的**日志输出器**使用```init```方式触发构建。

- 指定**日志输出组**非共享的**日志输出器**使用```create```方式触发构建。

- 每次业务执行时，使用**LoggerCore**实例执行```createGroupLogger()```创建新的**日志输出组**实例用于链路中的日志收集。

:::

### 输出器启动

同样，我们可以在[LoggerCore](#loggercore)构建时的配置参数中指定每个[日志输出器](/guide/logger-introduce)的```startTrigger```以控制何时启动这些**日志输出器**的实例：

- **```none```**：**LoggerCore**和**日志输出组**不执**日志输出器**的启动动作。通常，支持自动启动的输出器使用此方式触发启动，比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。

- **```normal```**：在**日志输出组**实例执行```start()```时触发**日志输出器**的启动动作，即：**日志输出器**伴随**日志输出组**启动。通常，不支持自动启动的输出器使用此方式触发启动，比如：手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。
  
### 输出器关闭

同样，我们可以在[LoggerCore](#loggercore)构建时的配置参数中指定每个[日志输出器](/guide/logger-introduce)的```closeTrigger```以控制何时关闭这些**日志输出器**的实例：

- **```none```**：**LoggerCore**和**日志输出组**不执**日志输出器**的关闭动作。通常，支持自动关闭的输出器使用此方式触发关闭，比如：自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。

- **```normal```**：在**日志输出组**实例执行```close()```时触发**日志输出器**的关闭动作，即：**日志输出器**伴随**日志输出组**关闭。通常，不支持自动关闭的输出器使用此方式触发关闭，比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)。

## LoggerCore

我们已经知道，**LoggerCore**是生产**日志输出组**的工厂。

通常，我们把**LoggerCore**实例在相同的日志收集场景中共享。在业务执行时，使用```createGroupLogger()```创建**日志输出组**实例用于跟踪业务链路中产生的日志。

---

**LoggerCore**实例创建**日志输出组**实例实际上执行了两个动作：

1. **LoggerCore**实例根据实例化时应用的配置参数，创建需要组合的[日志输出器](/guide/logger-introduce)实例并组成待植入**日志输出组**实例的**日志输出器实例列表**。

2. 实例化```createGroupLogger()```指定的**日志输出组**，得到对应的**日志输出组**实例。**日志输出组**实例化时会应用①中构造的**日志输出器实例列表**。

::: tip 说明

**日志输出器实例列表**中的元素其实并不仅仅是**日志输出器**实例本身，而是一个包含了**日志输出器**的行为触发方式的```Object```，其结构为：

- **```logger```**：**日志输出器**实例。

- **```startTrigger```**：**日志输出器**的启动触发方式。

- **```closeTrigger```**：**日志输出器**的关闭触发方式。

**日志输出组**将根据**行为触发方式**在恰当的时间点执行**日志输出器**实例的相关动作。

:::

### 配置说明

通常，实例化**LoggerCore**需要使用由**标识ID**、**输出器基础配置**和**输出器配置列表**构成的配置对象，即：```{ id, env, level, params, loggers }```。

- ```id```：**LoggerCore**的唯一标识，默认值为``` `LoggerCore_${generateRandomString(6, 'uln')}` ```。

::: tip 提示
我们可以通过在应用程序中使用唯一的```id```标识和存储**LoggerCore**实例以实现在相同日志收集场景中共享**LoggerCore**实例。
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

  另外，此配置将作为在**输出器配置列表**中指定**日志输出器**运行环境```env```时的默认值：

  - 未指定**日志输出器**的```env```时，使用此配置。

  - 指定了**日志输出器**的```env```时，使用实际配置。

- ```level```：**日志输出器**的基础最小日志输出等级的名称或别名。

  与[日志输出器](/guide/logger-introduce)相同，此配置的默认值依赖于当前**LoggerCore**的**运行环境**：

  - 当运行环境为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```all```。

  - 当运行环境不为```BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```error```。

  此配置的意义在于，将作为在**输出器配置列表**中指定**日志输出器**最小日志输出等级```level```时的默认值：

  - 未指定**日志输出器**的```level```时，使用此配置。

  - 指定了**日志输出器**的```level```时，使用实际配置。

- ```params```：**日志输出器**的基础功能配置参数。

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

### 配置参数

在**LoggerCore**创建**日志输出器**实例时，应用的**配置参数**通过将**个性化配置参数**合并至**默认配置参数**生成：

- **个性化配置参数**即是在**输出器配置列表**对**日志输出器**指定的**配置参数**。

- **默认配置参数**可能由以下两个部分组成：

  1. **LoggerCore**实例化时指定的```env```、```level```和```params```组成的**配置参数**。

  2. **LoggerCore**实例执行```createGroupLogger()```时传入的**配置参数**。

#### 默认配置参数
---

- **使用```init```触发创建行为的日志输出器**，其实例化时使用的**默认配置参数**将仅由**LoggerCore**实例化时指定的```env```、```level```和```params```组成。

- **使用```create```触发创建行为的日志输出器**，对于其使用的**默认配置参数**：
  
  1. 使用```Object.assign()```将```createGroupLogger()```时传入**配置参数**的功能配置参数```params```与**LoggerCore**实例化时指定的基础功能配置参数```params```合并，得到```{ params }```。

  2. 使用```Object.assign()```将```createGroupLogger()```时传入**配置参数**的**运行环境**与**最小输出等级**组成```{ env, level }```并与**LoggerCore**实例化时指定```env```和```level```合并，得到```{ env, level }```。

  3. 使用```Object.assign()```合并①和②得到**默认配置参数**。

#### 应用配置参数
---

在创建**日志输出器**实例时，**LoggerCore**使用与[默认配置参数](#默认配置参数)类似的方式合并**个性化配置参数**和**默认配置参数**生成最终应用于**日志输出器**的配置参数。因此，配置参数的优先级顺序从高到低依次为：

- **输出器配置列表**中指定的**配置参数**。

- ```createGroupLogger()```时指定的**配置参数**。

- 在**LoggerCore**实例化参数中指定的**配置参数**。

在默认的**配置参数**应用规则无法满足实际需求时，我们可以修改**LoggerCore**实例的```onBuildLogger```属性以定制**日志输出器**的创建行为，具体将在[运行原理](#运行原理)一节中讨论。

### 运行原理

我们已经知道，**LoggerCore**实例将在执行```createGroupLogger()```时创建**日志输出组**实例并向其中植入**日志输出器实例列表**。于是，小朋友你是否有很多问号：

- **日志输出器**实例如何创建？

- **日志输出器**实例何时创建？

在本节中，我们将围绕这两个问题讨论**LoggerCore**的运行原理。

---

对于**日志输出器实例如何创建**，答案非常简单：**LoggerCore**将在需要创建**输出器配置列表**某个**日志输出器**时，提取其在**输出器配置列表**指定的配置参数并调用实例方法```onBuildLogger()```。

```onBuildLogger()```接收三个参数用于创建**日志输出器**实例：

- **```type```**：**日志输出器**的类型。

- **```loggerConfigs```**：在**输出器配置列表**中指定的**个性化配置参数**。

- **```defaultConfigs```**：**LoggerCore**自动应用的[默认配置参数](#默认配置参数)。

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

在创建**日志输出组**时使用了：

```javascript
loggerCore.createGroupLogger({ level: 'all', params: { fileName: 'LogFile' } });
```

那么，**LoggerCore**调用```onBuildLogger()```时带入的参数为：

```javascript
type = Core.FileLogger;

loggerConfigs = { level: 'error', params: { auto: false, filePrefix: 'FileLogger_1' } };

defaultConfigs = { env: 'prod', level: 'all', params: { sourcePath: './testlogs', fileName: 'LogFile' } };
```

接下来，让我们看一看```onBuildLogger()```的默认合并**个性化配置参数**和**默认配置参数**的实现：

```javascript
onBuildLogger(type, loggerConfigs, defaultConfigs) {
  // 将个性化功能配置合并至默认功能配置
  const params = Object.assign({}, defaultConfigs.params, loggerConfigs.params);
  // 将个性化配置合并至默认配置并合并功能配置
  const configs = Object.assign({}, defaultConfigs, loggerConfigs, { params });
  // 执行输出器的实例化
  return new type(configs);
}
```

因此，我们可以通过修改**LoggerCore**实例的```onBuildLogger```属性进行更改以变更默认的**日志输出器**创建行为。

```javascript
const Core = require('node-corejs');

// 创建LoggerCore实例
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
    params: { 
      auto: false, 
      filePrefix: 'FileLogger_1',
      filePrefixAsFileName: false,
    }
  }],
});

// 必须在createGroupLogger()前修改onBuildLogger()
loggerCore.onBuildLogger = (type, loggerConfigs, defaultConfigs) => {
  // 在文件名中附加日志输出的次数
  const { fileName, count } = defaultConfigs.params;
  // 应用至原有的参数合并逻辑中
  const params = Object.assign({}, defaultConfigs.params, loggerConfigs.params, { fileName: `${fileName}_${count}` });
  const configs = Object.assign({}, defaultConfigs, loggerConfigs, { params });
  return new type(configs);
};

// 进行日志输出
let count = 0;

setInterval(() => {
  count += 1;
  // 在创建日志输出组时传入count
  const logger = loggerCore.createGroupLogger({
    params: { count, fileName: 'LogFile' }
  });
  logger.start();
  logger.log(new Error('一个🌰日志'));
  logger.close();
}, 500);
```

---

对于**日志输出器实例何时创建**，**LoggerCore**将根据在**输出器配置列表**中指定的**构建触发方式**决定创建**日志输出器**实例的时间点。

#### 实例化阶段
---

1. 根据**构建触发方式**对**输出器配置列表**中的配置对象进行分类。

2. 提取分类结果中使用```init```方式触发构建的配置对象，逐个使用配置对象内指定的配置执行```onBuildLogger()```创建对应的**日志输出器**实例并存储在实例属性```_baseLoggerObjects```中。

#### 执行```createGroupLogger()```
---

1. 根据```createGroupLogger()```传入的**配置参数**和**LoggerCore**实例的**配置参数**生成**默认配置参数**。

2. 提取并迭代分类结果中使用```create```方式触发构建的配置对象，使用配置对象内指定的配置参数和**默认配置参数**执行```onBuildLogger()```创建对应的**日志输出器**实例。

2. 合并**LoggerCore**实例属性```_baseLoggerObjects```中存储的**日志输出器**实例和①中创建的**日志输出器**实例组成待植入**日志输出组**实例的**日志输出器实例列表**。

3. 根据```createGroupLogger()```传入的**日志输出组类型**，创建对应的**日志输出组**实例并向其植入②中得到的**日志输出器实例列表**。

### 创建输出组

在实现细节上，**日志输出组**继承自[基础输出器](/guide/logger-introduce.html#基础输出器)，本质上是一个**高阶日志输出器**。虽然目前没有开放指定**日志输出组**的**功能配置参数**的相关API，我们可以通过在启动**日志输出组**之前修改其实例属性以控制其表现行为，目前支持修改**日志输出组**的以下属性：

- ```_errorHandler```
- ```_checkStateInLog```
- ```_checkStateInStart```
- ```_checkStateInClose```

我们可以在[基础输出器](/guide/logger-introduce.html#基础输出器)的[功能参数](/guide/logger-introduce.html#功能参数)一节中根据其同名的**功能配置参数**了解这些实例属性的作用。

---

```createGroupLogger()```支持多种调用方式：

- **```createGroupLogger()```**：不指定配置参数创建[基础输出组](#基础输出组)的实例。
- **```createGroupLogger(type)```**：不指定配置参数创建指定的**日志输出组**的实例。
- **```createGroupLogger(configs)```**：使用指定配置参数创建[基础输出组](#基础输出组)的实例。
- **```createGroupLogger(type, configs)```**：使用指定配置参数创建指定的**日志输出组**的实例。

::: warning 注意
```createGroupLogger()```执行过程中将对使用的**日志输出组**类型进行校验。出于保证应用程序的可用性考虑，如果使用了无效的**日志输出组**类型（即：非继承自[基础输出组](#基础输出组)的[自定义输出组](/guide/logger-group-customizing.html)），将默认创建**基础输出组**的实例。
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

我们已经知道，**LoggerCore**在创建**日志输出组**时会向其中植入**日志输出器实例列表**。其实，**日志输出组**将持有其对应的**LoggerCore**实例的引用以维持派生关系。因此，**日志输出组**的构造函数接收两个参数：

- ```loggerCore```：创建**日志输出组**的**LoggerCore**实例

- ```_loggerObjects```：**日志输出器**的实例列表

---

在构造阶段，**日志输出组**执行了三个动作：

1. 将派生**日志输出组**的**LoggerCore**实例存储至实例属性```loggerCore```。

2. 将**日志输出器实例列表**作为自定义功能配置参数生成**日志输出组**的配置对象。

3. 使用②中得到的配置对象执行```super()```操作完成实例化。

::: tip 提示
在[自定义输出器](/guide/logger-customizing.html)时执行```super()```操作将自动引导构造流程进入初始化阶段。

因此，为了避免执行逻辑混乱，在**构造函数**中仅使用功能配置参数的缓存机制存储**日志输出器实例列表**，而将实际的构造逻辑放在[初始化阶段](#initlogger)。
:::

#### ```initLogger()```
---

在讨论[LoggerCore](#loggercore)时我们已经提到过，**日志输出器实例列表**中的元素其实并不仅仅是**日志输出器**实例本身，而是一个包含了**日志输出器**的行为触发方式的```Object```。**日志输出组**将根据**行为触发方式**控制其组合的**日志输出器**执行启动/关闭动作。

因此，出于性能考虑，在初始化阶段中将预先解析**日志输出器实例列表**提取**日志输出器**实例完成时空转换：

- 提取使用```normal```方式触发启动的**日志输出器**实例，存储在实例属性```_needStartLoggers```中。

- 提取使用```normal```方式触发关闭的**日志输出器**实例，存储在实例属性```_needCloseLoggers```中。

- 将所有**日志输出器**实例存储在实例属性```_loggers```中。

#### ```onStart()```
---

在**日志输出组**的**启动阶段**，不仅需要变更**日志输出组**为启动状态；对于使用```normal```作为启动触发方式的**日志输出器**，还需在此阶段执行启动动作。因此，在**启动阶段**：

1. 执行```super.onStart()```尝试变更**日志输出组**为启动状态，如果变更状态失败则不再执行②。

2. 迭代实例属性```_needStartLoggers```，执行每个**日志输出器**实例的启动逻辑。

::: danger 注意
指定**日志输出组**实例的实例属性```_checkStateInStart```将控制执行```super.onStart()```时是否在变更**日志输出组**启动状态前执行状态校验进而影响**执行结果**。

在**启动阶段**的默认行为下，将通过判断```super.onStart()```的**执行结果**以避免**日志输出器**的启动逻辑多次执行。因此，请谨慎调整```_checkStateInStart```。
:::

#### ```onClose()```
---

与**日志输出组**的**启动阶段**类似，**关闭阶段**不仅需要变更**日志输出组**为关闭状态；对于使用```normal```作为关闭触发方式的**日志输出器**，还需在此阶段执行关闭动作。因此，在**关闭阶段**：

1. 执行```super.onClose()```尝试变更**日志输出组**为关闭状态，如果变更状态失败则不再执行②。

2. 迭代实例属性```_needCloseLoggers```，执行每个**日志输出器**实例的关闭逻辑。

::: danger 注意
指定**日志输出组**实例的实例属性```_checkStateInClose```将控制执行```super.onClose()```时是否在变更**日志输出组**启动状态前执行状态校验进而影响**执行结果**。

在**关闭阶段**的默认行为下，将通过判断```super.onClose()```的**执行结果**以避免**日志输出器**的关闭逻辑多次执行。因此，请谨慎调整```_checkStateInClose```。
:::

#### ```onLog()```

**日志输出组**本身并不产生任何日志，而是通过控制其组合的**日志输出器**输出日志。因此，**日志输出组**执行输出动作时：

1. 使用```onCheckState(BASE_LOGGER_STATE_TYPE_CAN_LOG)```检测当前状态是否允许日志输出，在**日志输出组**当前状态不允许日志输出时将抛出异常信息且不再执行②。

2. 迭代实例属性```_loggers```，执行每个**日志输出器**实例的```log()```进行日志输出。

::: danger 注意
指定**日志输出组**实例的实例属性```_checkStateInLog```将控制执行```onCheckState(BASE_LOGGER_STATE_TYPE_CAN_LOG)```时是否执行**日志输出组**的启动状态校验。

在默认的输出行为中，未启动**日志输出组**时将拒绝执行实际输出动作以保证资源的有效性。因此，请谨慎调整```_checkStateInLog```。
:::

### 定制输出组

在本节中，我们将定制一个简单的**日志输出组**用于客户端请求处理链路的日志收集：

- 记录```start()```和```close()```时间差统计处理耗时。

- 执行```start()```和```close()```时自动输出开启和关闭日志。

首先，我们通过继承自```Core.GroupLogger```的方式实现一个自定义的**日志输出组**：

```javascript
const Core = require('node-corejs');

/**
 * 自定义日志输出组
 */
class HandlerLogger extends Core.GroupLogger {
  initLogger(configs) {
    super.initLogger(configs);
    this.startTime = null;
  }

  onStart() {
    // 尝试执行原始启动逻辑
    // 在原始启动逻辑执行失败时不再执行后续逻辑
    if (!super.onStart()) {
      return false;
    }

    // 启动成功时记录启动时间并输出日志
    this.startTime = new Date();
    this.log('i', '处理开始', `请求处理的开始时间:[${Core.Utils.formatDate(this.startTime, 'YYYY-MM-DD HH:mm:ss.SSS')}]`);
    return true;
  }

  onClose() {
    // 检测当前状态是否允许输出日志
    // 允许输出日志时将记录关闭时间并输出日志
    if (this.onCheckState(Core.Macros.BASE_LOGGER_CHECK_TYPE_CAN_LOG)) {
      const closeTime = new Date();
      this.log('i', '处理结束', `请求处理的结束时间:[${Core.Utils.formatDate(closeTime, 'YYYY-MM-DD HH:mm:ss.SSS')}}],处理耗时:[${closeTime - this.startTime}]ms`);
    }

    // 执行原始的关闭逻辑
    return super.onClose();
  }
}
```

接下来，我们确定日志收集的场景：

- 将每次客户端请求处理链路中产生的日志输出至同一文件。

- 按照**请求路径**和**请求日期**对**日志文件**进行分类。

- **日志文件名**中需要保留**请求方式**和**请求时间**。

- 保留最近**7**天的日志。

因此，我们可以按照以下方式创建**LoggerCore**：

```javascript
const loggerCore = new Core.LoggerCore({
  env: 'prod',
  level: 'infos',
  params: { sourcePath: './testlogs' },
  loggers: [
    {
      type: Core.FileLogger,
      buildTrigger: 'create',
      startTrigger: 'normal',
      closeTrigger: 'normal',
      params: {
        auto: false,                  // 使用手动模式
        dateFormat: 'YYYY-MM-DD',     // 以天作为归档周期
        keepDateNum: 7,               // 保留最近7个归档日期
        dateAsFileName: false,        // 日志文件名不附加归档日期
        dateAsSourcePath: true,       // 使用归档日期分类日志文件
        filePrefixAsFileName: false,  // 日志文件名不附加归档前缀
        filePrefixAsSourcePath: true, // 使用归档前缀分类日志文件
      }
    }
  ],
});
```

最后，让我们结合**ServiceCore**实现对客户端请求处理链路的日志收集：

```javascript
class TestHandler extends Core.Handler {
  static getRoutePath() {
    return '/Test.do';
  }

  initHandler(req, res) {
    // 在初始化阶段创建日志输出组
    const method = req.method.toUpperCase();
    this.logger = loggerCore.createGroupLogger(HandlerLogger, {
      params: {
        filePrefix: 'Test.do',
        fileName: `${method}-${Core.Utils.formatDate(new Date(), 'YYYY-MM-DD_HH_mm_ss_SSS')}-[%RANDOM_FILE_NAME%]`,
      }
    });
    // 启动日志输出组
    this.logger.start();
  }

  getHandler(req, res, next) {
    // 记录链路日志
    this.logger.log('i', '进入GET处理阶段');
    setTimeout(() => {
      next('Hello World');
      this.logger.log('i', 'GET处理结束,向客户端返回');
    }, 500);
  }

  destroyHandler(req, res) {
    // 在析构阶段关闭日志输出组
    this.logger.close();
  }
}

// 创建ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([TestHandler]);
serviceCore.start();
```

现在，我们可以通过访问使用```curl http://localhost:3000/Test.do```来检验实现成功啦！