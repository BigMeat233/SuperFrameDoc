# 日志输出组

日志输出组支持聚合一个或多个[日志输出器](/guide/logger-introduce)应用于多点日志收集的场景。**日志输出组无法直接实例化，需要依赖[LoggerCore](#loggercore)执行```createLogger()```时创建输出组实例**。

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

**在执行```createLogger()```之前**，可以对LoggerCore实例```onBuildLogger```属性进行更改以变更输出器实例创建行为。默认行为下，**LoggerCore将使用输出器配置列表中的个性化配置**合并至**基础配置得到最终的输出器配置创建输出器实例。**

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

TODO - 

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

2. 输出组实例化即将结束时将自动触发**输出组初始化**。在输出组初始化过程中，将迭代```configs.params.loggerObjects```属性对输出器对象中的输出器实例进行缓存和分类：
    - 将输出器实例推入输出组的```_loggers```属性。
    - 将使用```normal```方式触发启动的输出器实例推入输出组的```_needStartLoggers```属性。
    - 将使用```normal```方式触发关闭的输出器实例推入输出组的```_needCloseLoggers```属性。

### 执行```start()```
  
::: warning 注意
**基础输出组默认不支持自动启动**，通常需要显式执行```start()```。
:::

1. 执行```super.start()```尝试执行启动，触发[基础输出器](/guide/logger-introduce.html#基础输出器)内置状态检测机制，启动失败时将直接向业务层返回```false```，不再执行实际启动逻辑。

2. 启动成功时，将迭代输出组的```_needStartLoggers```属性，执行每个输出器实例的```start()```启动输出器，并向业务层返回```true```表示输出组启动成功。

### 执行```close()```

::: warning 注意
**基础输出组默认不支持自动关闭**，通常需要显式执行```close()```。
:::

1. 执行```super.close()```尝试执行关闭，触发[基础输出器](/guide/logger-introduce.html#基础输出器)内置状态检测机制，关闭失败时将直接向业务层返回```false```，不再执行实际关闭逻辑。

2. 关闭成功时，将迭代输出组的```_needCloseLoggers```属性，执行每个输出器实例的```close()```关闭输出器，并向业务层返回```true```表示输出组关闭成功。


### 执行```log()```

迭代输出组的```_loggers```属性，执行每个输出器实例的```log()```进行输出。
