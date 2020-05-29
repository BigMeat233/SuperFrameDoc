# 日志输出组

日志输出组支持聚合一个或多个[日志输出器](/guide/logger-introduce)应用于多点日志收集的场景。**日志输出组无法直接实例化，需要依赖[LoggerCore](#loggercore)执行```createLogger()```创建输出组实例**。

::: tip 说明
本质上，日志输出组是一类特殊的[日志输出器](/guide/logger-introduce)，它们拥有相同的生命周期和使用方式。即：在业务层中输出器/组使用以下三个API管理生命周期或执行输出动作：

- ```log()```：输出日志
- ```start()```：启动输出器/组
- ```close()```：关闭输出器/组

与常规输出器不同的是：

- 日志输出组支持嵌入一个或多个日志输出器
- 日志输出组无实际日志输出行为，仅通过操作嵌入其内的日志输出器进行输出
:::

## 行为触发

引入LoggerCore和日志输出组后，将完全托管输出器的构建、启动、关闭和输出。此时，需要在LoggerCore实例化时配置输出器的行为触发方式间接控制输出器行为。

### 输出器构建

支持以下方式触发输出器构建：

- ```init```：在LoggerCore执行实例化时构建输出器。通常，持续型输出器（比如：[日期输出器](/guide/logger-introduce.html#日期输出器)）使用此方式触发构建。
- ```create```：在LoggerCore执行```createLogger()```时构建输出器。通常，临时型输出器（比如：[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发构建。

::: tip 提示
LoggerCore实例化动作仅执行一次。因此，使用```init```方式触发构建的输出器以LoggerCore维度单例的形式呈现，**将被LoggerCore创建的所有输出组实例共享**。

在一些重复型业务中，可能希望业务每次执行时使用相同输出器收集基础日志，且使用不同的输出器收集每次业务的链路日志。

- 若期望LoggerCore每次生成的输出组实例**使用共享的输出器**，则使用```init```方式触发输出器构建。
- 若期望LoggerCore每次生成的输出组实例**使用不同的输出器**，则使用```create```方式触发输出器构建。
:::

### 输出器启动

支持以下方式触发输出器启动：

- ```none```：LoggerCore和输出组不执行输出器启动。通常，支持自动启动的输出器（比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发启动。
- ```normal```：在日志输出组实例执行```start()```时启动输出器。通常，不支持自动启动的输出器（比如：手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发启动。
  
### 输出器关闭

支持以下方式触发输出器关闭：

- ```none```：LoggerCore和输出组不执行输出器关闭。通常，支持自动关闭的输出器（比如：自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发关闭。
- ```normal```：在日志输出组实例执行```close()```时关闭输出器。通常，不支持自动关闭的输出器（比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发关闭。

### 输出器输出

目前仅支持通过执行日志输出组实例的```log()```触发输出器的输出动作。

## LoggerCore

在使用LoggerCore和日志输出组的场景中，业务层不再直接操作[日志输出器](/guide/logger-introduce)，而是通过实例化LoggerCore时配置输出器的[行为触发](#行为触发)方式间接控制输出器行为。

LoggerCore每次执行```createLogger()```时根据业务层传入的日志输出组类型创建对应的输出组实例，并向输出组实例中植入根据LoggerCore配置生成的输出器。

::: tip 提示
通常，不同业务场景使用不同的LoggerCore，在业务执行时使用```createLogger()```创建新的输出组实例用于业务中的日志收集。
:::

### 运行原理

LoggerCore在实例化时接收**输出器配置列表**，在执行```createLogger()```时接收**输出组类型**。LoggerCore将根据输出组类型创建对应的输出组实例；并向输出组实例中植入根据输出器配置列表构造的**输出器对象列表**。

::: tip 说明
**输出器对象是LoggerCore和输出组实例交互的数据结构**。其结构为：
- ```logger```：输出器实例。
- ```startTrigger```：开启输出器的触发方式。
- ```closeTrigger```：关闭输出器的触发方式。
:::

::: warning 注意
输出器实例的创建行为完全在LoggerCore中进行，**LoggerCore将自动包装输出器实例为输出器对象**。

**在执行```createLogger()```之前**，可以对LoggerCore实例的```onBuildLogger```属性进行更改以变更输出器实例创建行为。默认行为下，**LoggerCore将使用输出器配置列表中的个性化配置**合并至**基础配置**得到**最终的输出器配置**创建输出器实例。

样例代码中使用默认行为演示如何变更输出器实例创建行为：

```javascript
const Core = require('node-corejs');
const loggerCore = new Core.LoggerCore();
// 必须在createLogger()前修改输出器创建行为
loggerCore.onBuildLogger = (type, loggerConfigs, defaultConfigs) => {
  // 输出器的功能配置参数为对象类型,优先合并
  const params = Object.assign({}, defaultConfigs.params, loggerConfigs.params);
  // 合并顶层对象和功能配置参数得到最终配置对象
  const configs = Object.assign({}, defaultConfigs, loggerConfigs, { params });
  // 进行实例化
  return new type(configs);
};
const logger = loggerCore.createLogger();
```
:::

- #### LoggerCore实例化
  
  1. 首先对传入的输出器配置列表进行分类：
     - 将使用```init```方式触发构建的输出器配置推入LoggerCore的```_loggerConfigsUseInitTriggerList```属性。
     - 将使用```create```方式触发构建的输出器配置推入LoggerCore的```_loggerConfigsUseCreateTriggerList```属性。

  2. 然后迭代```_loggerConfigsUseInitTriggerList```属性中的输出器配置，创建对应的**输出器对象**推入```_baseLoggerObjects```属性。
     
  ::: tip 提示
  **LoggerCore实例化动作仅执行一次**。因此，在实例化时创建使用```init```方式触发构建的输出器可以保证其为LoggerCore维度单例。
  
  **LoggerCore创建的每个输出组实例将共享```_baseLoggerObjects```中的输出器。**
  :::

- #### LoggerCore执行```createLogger()```

  1. 首先迭代```_loggerConfigsUseCreateTriggerList```属性中的输出器配置，创建对应的**输出器对象**构成**临时输出器对象列表**（即：在执行```createLogger()```时创建使用```create```方式触发构建的输出器实例）。

  2. 连接```_baseLoggerObjects```和**临时输出器对象列表**构成**完整的输出器对象列表**。

  3. 最后根据**输出组类型（默认为[基础输出组](#基础输出组)）**和**完整的输出器对象列表**创建输出组实例。  

### 配置说明

LoggerCore在实例化时接收**基础配置**和**输出器配置列表**构成的对象，即：```{ id, env, level, params, loggers }```。

- ```id```：LoggerCore的唯一标识，默认值为``` `LoggerCore_${generateRandomString(6, 'uln')}` ```。
- ```env```：LoggerCore的运行环境，默认值为```Core.Macros.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```。

  ::: danger 注意
  **此配置将作为在```loggers```中对日志输出器进行针对性配置时```env```的默认值：**

  - 如果没有配置日志输出器的```env```，则使用此配置的值。
  - 如果配置了日志输出器的```env```，则使用实际配置的值。
  :::

  运行环境将影响LoggerCore行为：

  - 当运行环境为```Core.Macros.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，**LoggerCore创建输出器实例时将忽略```loggers```配置**，仅创建一个使用```init```方式触发构建的[基础输出器](/guide/logger-introduce.html#基础输出器)。
  - 当运行环境不为```Core.Macros.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，LoggerCore将根据实际配置创建日志输出器实例。

- ```level```：最小日志输出等级名称或别名，输出组仅输出权重大于等于此输出等级的日志。

  ::: danger 注意
  **此配置将作为在```loggers```中对日志输出器进行针对性配置时```level```的默认值：**

  - 如果没有配置日志输出器的```level```，则使用此配置的值。
  - 如果配置了日志输出器的```level```，则使用实际配置的值。
  :::

  最小输出等级的默认值依赖于当前运行环境：

  - 当运行环境为```Core.Macros.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```all```。
  - 当运行环境不为```Core.Macros.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```error```。

- ```params```：日志输出器的基础功能配置参数。

  ::: danger 注意
  **LoggerCore默认行为下通过```Object.assign()```将个性化配置合并至此配置得到最终配置创建日志输出器实例**。可以对LoggerCore实例的```onBuildLogger```属性进行更改以变更输出器实例的默认创建行为。
  :::

- ```loggers```：日志输出器配置列表。日志输出器配置对象结构为：```{ type, buildTrigger, startTrigger, closeTrigger, env, level, params  }```。
  - ```type```：日志输出器的类型，可以使用Corejs内置输出器或[自定义输出器](/guide/logger-customizing.html)，默认值为```null```。
    
    ::: warning 注意
    LoggerCore创建输出器时将对日志输出器的类型进行校验，如果设置了未继承自```Core.BaseLogger```的自定义输出器时，将认为类型无效不再创建输出器实例。
    :::

  - ```buildTrigger```：日志输出器的[构建触发方式](#输出器构建)，默认值为```'init'```。
  - ```startTrigger```：日志输出器的[启动触发方式](#输出器启动)，默认值为```'none'```。
  - ```closeTrigger```：日志输出器的[关闭触发方式](#输出器关闭)，默认值为```'none'```。
  - ```env```：日志输出器的运行环境，默认值为LoggerCore的运行环境。
  - ```level```：最小日志输出等级名称或别名，默认值为LoggerCore的最小日志输出等级名称或别名。
  - ```params```：日志输出器的个性化功能配置参数，LoggerCore创建输出器实例时将使用```Object.assign()```将此配置合并至**基础功能配置参数**得到最终配置。

### 样例代码

样例代码中实现了多点日志收集：

- 以秒为周期进行日志收集，归档目录为```./logs/Cycle_1s```：每秒内产生的日志体积超出1K时自动分割，且仅保留最近5秒内的日志。
- 5秒内产生的日志归档至同一文件，文件路径为```./logs/Duration_5s/_.<%开始时间%>.[FN].log```：仅保留最后2个的归档文件（即：最近10秒内的日志）。

```javascript
const Core = require('node-corejs');

const loggerCore = new Core.LoggerCore({
  env: 'prod',
  level: 'infos',
  // 设置基础属性
  params: {
    sourcePath: './logs',
    filePrefixAsSourcePath: true,
    filePrefixAsFileName: false,
    dateFormat: 'YYYY-MM-DD_HH:mm:ss',
    keepDateNum: 2,
    keepFileExt: true,
  },
  // 设置输出器配置列表
  loggers: [{
    // 日期输出器
    type: Core.DateLogger,
    buildTrigger: 'init', // 使每个输出组实例共享日期输出器
    startTrigger: 'none',
    closeTrigger: 'none',
    params: {
      filePrefix: 'Cycle_1s',
      keepDateNum: 5,
      maxSize: 1024,
    },
  }, {
    // 文件输出器配置
    type: Core.FileLogger,
    buildTrigger: 'create', // 使每个输出组实例独享文件输出器
    startTrigger: 'none',
    closeTrigger: 'none',
    params: {
      filePrefix: 'Duration_5s',
      fileName: '_',
      auto: true,
      timeout: 5000,
      dateAsSourcePath: false,
      dateAsFileName: true,
    },
  }],
});

let count = 0;

setInterval(() => {
  // 创建并启动输出组
  const logger = loggerCore.createLogger();
  logger.start();

  for (let i = 0; i < 5; i++) {
    // 执行日志输出
    setTimeout(() => {
      for (let j = 0; j < 10; j++) {
        count += 1;
        logger.log(new Error(`GroupLogger测试输出 -> ${count}`));
      }
    }, i * 1000);
    // 日志输出完成后关闭输出组
    if (i == 4) {
      setTimeout(() => {
        logger.close();
      }, 4500);
    }
  }
}, 5000);
```

## 基础输出组

LoggerCore执行```createLogger()```时，**如果没有指定输出组类型，将创建基础输出组的实例**。[自定义输出组](/guide/logger-group-customizing.html)时需要继承基础输出组。

::: tip 提示
**在实现细节上，基础输出组继承[基础输出器](/guide/logger-introduce.html#基础输出器)**。因此，基础输出组拥有日志输出器内置的生命周期控制、状态检测等功能。
:::

### 实例化与初始化

1. **输出组实例化**时接收从LoggerCore传来的**输出器对象列表**，将执行```super()```操作使用[基础输出器](/guide/logger-introduce.html#基础输出器)会进行配置缓存的特性，缓存**输出器对象列表**至```configs.params.loggerObjects```属性。

    ::: danger 注意
    **[自定义输出组](/guide/logger-group-customizing.html)时尽量遵守此规则：**

    **```super()```执行过程中将自动执行```initLogger()```。若在实例化时执行过多业务逻辑，可能导致执行顺序与预期不符。因此，输出组实例化时仅使用原始特性缓存输出器列表，实际的初始化逻辑将在```initLogger()```中进行。**
    :::

2. 输出组实例化即将结束时自动触发**输出组初始化**。在输出组初始化过程中，将迭代```configs.params.loggerObjects```属性对输出器对象中的输出器实例进行缓存和分类：
    - 将输出器实例推入输出组的```_loggers```属性。
    - 将使用```normal```方式触发启动的输出器实例推入输出组的```_needStartLoggers```属性。
    - 将使用```normal```方式触发关闭的输出器实例推入输出组的```_needCloseLoggers```属性。

### 执行```start()```
  
::: warning 注意
**基础输出组默认不支持自动启动**，通常需要显式执行```start()```。
:::

1. 执行```super.start()```尝试执行启动，触发[基础输出器](/guide/logger-introduce.html#基础输出器)内置状态检测机制。启动失败时将直接向业务层返回```false```，不再执行实际启动逻辑。

2. 启动成功时，将迭代输出组的```_needStartLoggers```属性，执行每个输出器实例的```start()```启动输出器，并向业务层返回```true```表示输出组启动成功。

### 执行```close()```

::: warning 注意
**基础输出组默认不支持自动关闭**，通常需要显式执行```close()```。
:::

1. 执行```super.close()```尝试执行关闭，触发[基础输出器](/guide/logger-introduce.html#基础输出器)内置状态检测机制。关闭失败时将直接向业务层返回```false```，不再执行实际关闭逻辑。

2. 关闭成功时，将迭代输出组的```_needCloseLoggers```属性，执行每个输出器实例的```close()```关闭输出器，并向业务层返回```true```表示输出组关闭成功。


### 执行```log()```

1. 使用```onCheckState(BASE_LOGGER_STATE_TYPE_CAN_LOG)```检测输出组当前状态是否允许日志输出。不允许输出时将按照基础输出器的默认行为进行处理，不再执行实际输出逻辑。

2. 输出器状态允许输出时，将迭代输出组的```_loggers```属性，逐个执行每个输出器实例的```log()```进行日志输出。
