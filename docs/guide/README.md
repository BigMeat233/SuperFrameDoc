# 介绍

Corejs由两个部分组成：**核心组件**和**辅助API**。

- Web服务相关的核心组件：**ServiceCore**、**Handler**
- 日志收集相关的核心组件：**LoggerCore**、**BaseLogger**、**DateLogger**、**FileLogger**、**GroupLogger**
- 进程管理相关的核心组件：**ClusterCore**、**AppMain**

## 功能

**Web服务相关**

- [TLS/SSL](/guide/web-service.html#tls-ssl)
- [全局中间件](/guide/web-service.html#全局中间件)
- [局部中间件](/guide/request-handler.html#中间件系统-2)
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
- [应用级全局对象](/guide/cluster-manager.html#全局对象)
- [TraceIPC/IPC](/guide/cluster-manager.html#进程间通信)

## 与Express.js的关系

Corejs的Web服务组件**ServiceCore**使用**Express.js**作为基础框架。**ServiceCore**启动时，将按照以下流程创建**Express实例**：

- 将**全局拦截器**封装为**Express标准中间件**挂载至Express中间件列表的最前端，用于拦截所有用户请求。
- 将**全局中间件列表**中的中间件逐个挂载至**Express中间件列表**，使有效请求进入中间件管道且兼容Express生态。
- 将**Handler列表**中每个Handler的**请求路径**和**业务处理**封装为**Express路由中间件**挂载至Express实例，用于请求分流。
- 将**全局错误拦截器**封装为**Express标准中间件**挂载至Express中间件列表的最末端，捕获处理过程中产生的异常。

::: warning 注意
设置全局错误拦截器时，ServiceCore将自动包装全局错误拦截器为Express错误处理中间件，无需关注参数列表。
:::
