---
author: qinyi
created_at: 2026-06-02 23:27:07
---

# task-07: 生成示例模块卡片

## 目标

生成一个示例模块卡片文件，展示精简后的格式。

## 操作步骤

1. 创建 `.sillyspec/docs/sillyspec/modules/module-card.example.md` 文件
2. 写入以下内容：

```markdown
---
schema_version: 1
doc_type: module-card
module_id: auth-service
---

# auth-service

## 定位

负责用户认证、授权和 token 管理。不负责用户信息存储（由 users 模块负责）。

## 契约摘要

核心能力：
- 用户登录（邮箱/密码、OAuth）
- Token 生成和验证（JWT）
- 权限检查（RBAC）
- Token 刷新和撤销

具体导出符号以 _module-map.yaml 的 entrypoints/main_symbols 为准：
- `authenticate` - 登录验证
- `authorize` - 权限检查
- `signToken` - Token 生成
- `refreshToken` - Token 刷新
- `AuthService` - 核心服务类
- `AuthController` - 控制器
- `hashPassword` - 密码哈希
- `verifyPassword` - 密码验证

## 关键逻辑

登录流程：
```text
接收凭证 → 验证密码 → 生成 JWT → 返回 token
```

权限检查：
```text
解析 token → 提取角色 → 检查权限 → 放行/拒绝
```

## 注意事项

- 修改密码哈希算法时需同步检查 users 模块的密码字段
- Token 过期时间配置在环境变量中，修改后需重启服务
- RBAC 规则存储在数据库，变更时需清除缓存

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
```

3. 保存文件

## 完成标准

- `module-card.example.md` 包含完整的格式示例
- 示例包含 5 个章节：定位、契约摘要、关键逻辑、注意事项、人工备注
- 契约摘要明确说明具体导出符号以 _module-map.yaml 为准
- 不包含 paths、tags、aliases 等结构化索引信息
- 人工备注区域保持空标记