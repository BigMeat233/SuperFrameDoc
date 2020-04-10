---
home: true
heroImage: /images/logo.png
heroText: Node-Corejs
tagline: 为NodeJS全栈开发赋能
actionText: 快速上手 →
actionLink: /guide/
features:
- title: 简单
  details: 核心API仅十余个，极低学习成本向Node全栈开发过渡，无需了解底层知识，专注业务层开发。
- title: 友好
  details: 兼容Express中间件生态，支持中间件动态调用和挂载，支持全局/局部中间件配置。
- title: 高效
  details: 内置日志输出器、进程管理模型，开箱即用。
footer: MIT Licensed | Copyright © 2020-present Douzi
---
### 仅需三步启动服务

```javascript
const Core = require('node-corejs');
// 定义Handler
class Handler extends Core.Handler {
    static getRoutePath() { return '/Test.do' }
    getHandler(req, res, next) { next('Hello World') }
}
// 创建ServiceCore
const serviceCore = new Core.ServiceCore();
serviceCore.bind([Handler]);
// 启动服务
serviceCore.start();
```

::: warning 注意
生产环境中要求Node.js >= 8.0.0
:::
