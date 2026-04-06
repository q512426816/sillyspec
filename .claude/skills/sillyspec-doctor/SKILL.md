---
name: sillyspec:doctor
description: 项目自检 — 检查 CLI、配置、构建环境和外部依赖
---

## 前置检查

**在执行任何检查之前，先确认 SillySpec CLI 是否可用：**

1. 运行 `sillyspec --version`
2. 如果失败：
   - 输出：❌ SillySpec CLI 未安装
   - 给出安装命令：`npm install -g sillyspec`
   - 停止，不要继续后续步骤

## 执行

CLI 可用后，运行 `sillyspec run doctor`，按提示逐步执行。
每步完成后运行 `sillyspec run doctor --done --output "摘要"`。

## 用户指令
$ARGUMENTS
