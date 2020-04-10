# 介绍

Corejs由两个部分组成：核心组件和辅助API。

- Web服务相关的核心组件：ServiceCore、Handler
- 日志收集相关的核心组件：LoggerCore、BaseLogger、DateLogger、FileLogger、GroupLogger
- 进程管理相关的核心组件：ClusterCore、AppMain

## Features

**Web服务相关**

- [TLS/SSL](/guide/web-service.html#启用tls-ssl)
- [全局中间件](/guide/web-service.html#全局中间件)
- [局部中间件](/guide/request-handler.html#handler中间件)
- [动态中间件](/guide/dynamic-middleware)
- [全局拦截器](/guide/web-service.html#全局拦截器)
- [错误拦截器](/guide/web-service.html#错误拦截器)

**日志收集相关**

- 按日期归档
- 按文件归档
- 日志组构建
- 过期日志清理
- 自定义输出器
- 自定义日志组

**进程管理相关**

- 生命周期管理
- 创建子进程
- 应用级全局对象
- TraceIPC/IPC

## 与Express.js的关系

Corejs的Web服务组件ServiceCore使用Express.js作为基础框架。ServiceCore启动时，会按照下述流程创建Express实例：

- 将全局拦截器封装为Express标准中间件挂载至Express中间件列表的最前端，用于拦截所有用户请求。
- 将全局中间件列表中的中间件逐个挂载至Express中间件列表，使有效请求进入中间件管道且兼容Express生态中间件。
- 将Handler列表中每个Handler的请求路径封装为Express路由挂载至Express实例，用于特定请求路径执行个性化处理。
- 将全局错误拦截器封装为Express标准中间件挂载至Express中间件列表的最后端，用于捕获处理过程中产生的异常。

至此，Express.js实例构建完毕。

::: warning 注意

设置Express错误拦截器时函数入参列表必须为```(err, req, res, next)```，而在设置ServiceCore错误拦截器时，将会自动包装传入的函数为4参数函数挂载至Express，无需关注入参数量。

:::
