---
home: true
heroImage: /images/logo.png
heroText: Node-Corejs
tagline: 为NodeJS全栈开发赋能
actionText: 快速上手 →
actionLink: /guide/
features:
- title: 简单
  details: 核心API仅十余个，以极低学习成本向Node全栈开发过渡，无需了解底层知识，专注业务层开发。
- title: 友好
  details: 兼容Express中间件生态，支持中间件动态挂载和调用，支持多维度中间件配置。
- title: 高效
  details: 内置Web服务器、日志输出器、进程管理模型，且支持自动异常捕获，开箱即用。
footer: MIT Licensed | Copyright © 2020-present Douzi
---
### 仅三步启动Web服务

```javascript
// Web服务默认驻留3000端口
// 测试指令: curl http://localhost:3000 -w '%{http_code}\n'
const Core = require('node-corejs');
const serviceCore = new Core.ServiceCore();
serviceCore.start();
```

::: warning 注意
生产环境中要求Node.js >= 8.0.0
:::
