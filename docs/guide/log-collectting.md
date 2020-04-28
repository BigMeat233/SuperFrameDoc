# 日志收集

## 介绍

Corejs提供[日志输出器](#日志输出器)和[日志输出组](#日志输出组)进行单点/组合日志收集。日志输出组必须依赖Corejs日志组件[LoggerCore](/guide/logger-group-introduce.html#loggercore)使用。

::: tip 说明
**[日志输出组](#日志输出组)中可以嵌入一个或多个[日志输出器](#日志输出器)以实现日志组合收集，其本质上是一种特殊类型的日志输出器**。日志输出组统一管理其内部日志输出器的生命周期，使用输出组进行输出行为时，输出组将逐个调用内置输出器的```log()```实现多点输出。
:::

**日志输出器**和**日志输出组**有相同的生命周期和输出API，即：

- 使用```log()```输出日志，仅允许在输出器/组启动状态下调用，否则将输出警告。
- 使用```start()```启动输出器/组，此时将初始化资源（如：文件句柄等）并将输出器/组置为启动状态。
- 使用```close()```关闭输出器/组，此时将释放初始化过程中创建的资源（如：文件句柄等）并将输出器/组置为关闭状态。

::: tip 关于LoggerCore、日志输出组、日志输出器
**[日志输出组](#日志输出组)和[日志输出器](#日志输出器)实例可以使用```log()```直接进行日志输出**。但是，**日志输出组无法直接创建实例**。只能依赖于[LoggerCore](/guide/logger-group-introduce.html#loggercore)每次执行```createLogger()```时将传入的日志输出组实例化得到输出组的实例。LoggerCore执行```createLogger()```时，将**根据其配置的输出器列表实例化相应的输出器，并植入先前创建的输出组实例中**。因此，使用LoggerCore进行多点日志的场景下，LoggerCore是生产日志输出组的工厂，日志输出组是日志输出器的运行容器。
:::

::: warning 注意
[LoggerCore](/guide/logger-group-introduce.html#loggercore)中可以配置日志输出器的**基础配置**；在配置输出器列表时可以针对每个输出器**定制配置**。LoggerCore实例化输出器时**将定制配置通过```Object.assign()```合并至基础配置**得到实际的输出器配置。
:::

## 日志输出器

日志输出器可以单独使用，也可以通过[LoggerCore](/guide/logger-group-introduce.html#loggercore)植入日志输出组中使用。

::: danger 注意
[自定义输出器](/guide/logger-customizing.html)必须继承[基础输出器](/guide/logger-introduce.html#基础输出器)，否则配合[LoggerCore](/guide/logger-group-introduce.html#loggercore)使用时将**被认为是无效的输出器**。
:::

推荐学习路线为：

- 先学习[输出器配置](/guide/logger-introduce.html#输出器配置)、[输出等级](/guide/logger-introduce.html#输出等级)和[等级选举](/guide/logger-introduce.html#等级选举)了解输出器的运行原理。
- 再学习[基础输出器](/guide/logger-introduce.html#基础输出器)，掌握输出器的基本功能和配置。
- 再学习[日期输出器](/guide/logger-introduce.html#日期输出器)和[文件输出器](/guide/logger-introduce.html#文件输出器)，掌握输出器的日常使用场景。
- 最后学习[日志输出模型](/guide/logger-introduce.html#输出器模型)和[自定义输出器](/guide/logger-customizing.html)，定制更符合业务场景的输出器。

日志输出器有三个核心API：

- 使用```log()```进行日志输出。
- 使用```start()```启动日志输出器。
- 使用```close()```关闭日志输出器。

::: warning 注意
通常，**日志输出器仅允许在启动状态下输出日志**（可通过配置修改此行为，详细介绍见[基础输出器](/guide/logger-introduce.html#基础输出器)），即**执行```start()```启动输出器后才能输出日志**。一些支持自启动的日志输出器实例化后自动启动，无须再显式执行```start()```即可输出日志。
:::

Corejs内置了多种日志输出器：

- [基础输出器](/guide/logger-introduce.html#基础输出器)
- [日期输出器](/guide/logger-introduce.html#日期输出器)
- [文件输出器](/guide/logger-introduce.html#文件输出器)

## 日期输出组

**日志输出组必须配合LoggerCore使用**。在执行```createLogger()```时，[LoggerCore](/guide/logger-group-introduce.html#loggercore)首先**根据传入的日志输出组类型创建对应的输出组实例**（默认使用[基础输出组](/guide/logger-group-introduce)），**然后根据实例化LoggerCore时的输出器配置创建对应的输出器实例植入先前创建的输出组实例中**。可以通过[定制输出组](/guide/logger-group-customizing)的方式使日志收集与业务层结合。

推荐学习路线为（需要对日志输出器有一定了解）：

- 先学习[LoggerCore](/guide/logger-group-introduce.html#loggercore)的[运行原理](/guide/logger-group-introduce.html#运行原理)。
- 再学习[LoggerCore](/guide/logger-group-introduce.html#loggercore)的日常使用，掌握[行为触发器](/guide/logger-group-introduce.html#行为触发器)在[日志输出器](/guide/logger-introduce)生命周期中的作用。
- 最后学习[自定义输出组](/guide/logger-group-customizing.html)将日志输出与业务结合。
