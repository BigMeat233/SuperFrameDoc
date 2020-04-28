# 日志输出组

## 介绍

允许多个输出器、是做多点输出的，必须依赖LoggerCore，每次creat都将创建一个新实例，start、close、log时做了什么，然后注意有一些Logger是LoggerCore维度唯一的
使用场景：多点输出、结合业务

## LoggerCore

### 使用场景

### 配置说明

### 运行原理

配置合并原理，创建Logger时机，创建Group原理时机，注意Dev环境锁Logger，演示更换buildlogger方式

## 行为触发器

### 构建触发器

### 启动触发器

### 关闭触发器

## 基础输出组

介绍，自定义时需要继承，start，close，log时做了什么，内置属性解析
