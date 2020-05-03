# 日志输出组

**日志输出组**支持聚合一个或多个[日志输出器](/guide/logger-introduce)应用于多点日志收集的场景。通常情况下，**日志输出组无法直接实例化**，需要依赖[LoggerCore](#loggercore)每次执行```createLogger()```生成输出组实例。

::: tip 说明
**本质上，日志输出组是一类特殊的[日志输出器](/guide/logger-introduce)，它们拥有相同的生命周期和使用方式**。即：在业务层中输出器/组使用以下三个API管理生命周期和执行输出行为：

- ```log()```：输出日志
- ```start()```：启动输出器/组
- ```close()```：关闭输出器/组
:::

## 行为触发

引入**LoggerCore**和**日志输出组**后，将完全托管输出器的构建、启动、关闭和输出。此时需要在LoggerCore实例化时配置输出器的行为触发方式间接控制输出器行为。

### 输出器构建

支持以下方式触发**输出器构建**：

- ```init```：在**LoggerCore执行实例化**时构建输出器。通常，持续型输出器（比如：[日期输出器](/guide/logger-introduce.html#日期输出器)）使用此方式触发构建。
- ```create```：在**LoggerCore执行```createLogger()```**时构建输出器。通常，临时型输出器（比如：[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发构建。

::: tip 提示
**LoggerCore实例化动作仅执行一次**。因此，使用```init```方式触发构建的输出器呈现以**LoggerCore维度单例**的形式，将被派生的所有输出组实例共享。

在一些重复型业务中，可能希望业务每次执行时**使用相同输出器收集基础日志**，而**使用不同的输出器收集每次业务的链路日志**。

- 若期望**LoggerCore每次生成的输出组实例共享使用的输出器**，则使用```init```方式触发输出器构建。
- 若期望**LoggerCore每次生成的输出组实例使用不同的输出器**，则使用```create```方式触发输出器构建。
:::

### 输出器启动

支持以下方式触发**输出器启动**：

- ```none```：LoggerCore和输出组**不执行输出器启动**。通常，支持自动启动的输出器（比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发启动。
- ```normal```：在**输出组执行```start()```**时启动输出器。通常，不支持自动启动的输出器（比如：手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发启动。
  
### 输出器关闭

支持以下方式触发输出器关闭：

- ```none```：LoggerCore和输出组**不执行输出器关闭**。通常，支持自动关闭的输出器（比如：自动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发关闭。
- ```normal```：在**输出组执行```close()```**时关闭输出器。通常，不支持自动关闭的输出器（比如：[日期输出器](/guide/logger-introduce.html#日期输出器)、手动模式下的[文件输出器](/guide/logger-introduce.html#文件输出器)）使用此方式触发关闭。

### 输出器输出

目前仅支持通过执行输出组的```log()```触发输出器的输出行为。

## LoggerCore

在使用**LoggerCore**和**日志输出组**的场景下，业务层不再直接操作[日志输出器](/guide/logger-introduce)，而是通过**实例化LoggerCore时配置**输出器的[行为触发](#行为触发)方式间接控制输出器行为。

LoggerCore每次执行```createLogger()```时**根据业务层传入的日志输出组类型创建对应的输出组实例**，并**向输出组实例中植入根据LoggerCore配置生成的输出器**。

::: tip 提示
通常，**不同业务场景使用不同的LoggerCore，在业务执行时使用```createLogger()```创建新的输出组实例用于业务中的日志收集**。
:::

### 运行原理

LoggerCore在实例化时接收输出组实例包含的输出器列表配置。在执行```createLogger()```时接收输出组的类型，根据此类型创建对应的输出组实例；并向输出组实例植入根据输出器列表配置构造的输出器实例列表。

::: danger 注意
执行```createLogger()```得到的结果是聚合了LoggerCore配置中的输出器实例的**日志输出组实例**。
:::

- #### LoggerCore实例化

  1. 首先将对收到的输出器配置列表进行解析和分类，根据**构建触发方式**的不同将输出器配置分别存储至内部变量```_loggerConfigsUseInitTriggerList```和```_loggerConfigsUseCreateTriggerList```。
  2. 当解析输出器配置完成后，迭代```_loggerConfigsUseInitTriggerList```中存储的使用```init```作为构建触发方式的输出器配置，

  LoggerCore实例化时，将解析配置中的输出器，并按照其构建触发方式分类，创建触发方式为```init```的输出器缓存在LoggerCore全局

- #### LoggerCore执行```createLogger()```

  LoggerCore执行createLogger()时，创建触发方式为```create```的输出器，联合缓存在LoggerCore中触发方式为```init```的输出器组成需要植入输出组实例的输出器列表，然后根据传入值使用输出器列表创建输出组实例。

  注意输出器创建操作完全在LoggerCore中进行，可以通过重写onBuildLogger改写默认的输出器创建规则，默认规则合并参数，需要样例代码

- #### 输出组执行```start()```

- #### 输出组执行```close()```

- #### 输出组执行```log()```

### 配置说明

## 基础输出组

介绍，自定义时需要继承，start，close，log时做了什么，内置属性解析
