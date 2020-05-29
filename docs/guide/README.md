# 介绍

Corejs由两个部分组成：核心组件和辅助API。

- Web服务相关的核心组件：ServiceCore、Handler
- 日志收集相关的核心组件：LoggerCore、BaseLogger、DateLogger、FileLogger、GroupLogger
- 进程管理相关的核心组件：ClusterCore、AppMain

## 功能

**Web服务相关**

- [TLS/SSL](/guide/web-service.html#启用tls-ssl)
- [全局中间件](/guide/web-service.html#全局中间件)
- [局部中间件](/guide/request-handler.html#handler中间件)
- [动态中间件](/guide/dynamic-middleware)
- [全局拦截器](/guide/web-service.html#全局拦截器)
- [错误拦截器](/guide/web-service.html#错误拦截器)

**日志收集相关**

- [基础输出器](/guide/logger-introduce.html#基础输出器)
- [日期输出器](/guide/logger-introduce.html#日期输出器)
- [文件输出器](/guide/logger-introduce.html#文件输出器)
- [日志输出组](/guide/logger-group-introduce.html)
- [自定义输出器](/guide/logger-customizing.html)
- [自定义输出组](/guide/logger-group-customizing.html)

**进程管理相关**

- [应用生命周期](/guide/cluster-manager.html#多进程模型)
- [应用级全局对象](/guide/cluster-manager.html#全局对象维护)
- [TraceIPC/IPC](/guide/cluster-manager.html#进程间通信)

## 与Express.js的关系

Corejs的Web服务组件ServiceCore使用Express.js作为基础框架。ServiceCore启动时，会按照以下流程创建Express实例：

- 将全局拦截器封装为Express标准中间件挂载至Express中间件列表的最前端，用于拦截所有用户请求。
- 将全局中间件列表中的中间件逐个挂载至Express中间件列表，使有效请求进入中间件管道且兼容Express生态。
- 将Handler列表中每个Handler的请求路径封装为Express路由中间件挂载至Express实例，用于对请求路径执行针对性处理。
- 将全局错误拦截器封装为Express标准中间件挂载至Express中间件列表的最末端，用于捕获处理过程中产生的异常。

::: warning 注意
设置Express错误处理中间件时，参数列表必须为```(err, req, res, next)```，而在设置错误拦截器时，ServiceCore将会自动包装错误拦截器为标准错误处理中间件挂载至Express，无需关注参数列表。
:::
