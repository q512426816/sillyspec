---
author: qinyi
created_at: 2026-06-02 23:27:06
---

# task-06: 生成示例 _module-map.yaml

## 目标

生成一个示例 _module-map.yaml 文件，展示完整的格式。

## 操作步骤

1. 创建 `.sillyspec/docs/sillyspec/modules/_module-map.example.yaml` 文件
2. 写入以下内容：

```yaml
schema_version: 1
project: multi-agent-platform
source_commit: abc1234
generated_at: 2026-06-02 23:27:06
generator: sillyspec-scan

modules:
  auth-service:
    status: active
    doc: modules/auth-service.md
    paths:
      - src/modules/auth/**
      - src/middleware/auth.js
    tags:
      - auth
      - jwt
      - rbac
      - middleware
    aliases:
      - login
      - token
      - authentication
    entrypoints:
      - authenticate
      - authorize
      - signToken
      - refreshToken
    main_symbols:
      - AuthService
      - AuthController
      - hashPassword
      - verifyPassword
    depends_on:
      - users
      - redis
    used_by:
      - api-routes
      - admin-routes
    needs_review: false
    concerns: []
    review_reasons: []

  users:
    status: active
    doc: modules/users.md
    paths:
      - src/modules/users/**
      - src/models/user.js
    tags:
      - user
      - profile
      - account
    aliases:
      - member
      - account
    entrypoints:
      - getUser
      - updateUser
      - deleteUser
    main_symbols:
      - UserService
      - UserController
      - UserModel
    depends_on:
      - database
    used_by:
      - auth-service
      - orders
    needs_review: false
    concerns: []
    review_reasons: []

  database:
    status: active
    doc: modules/database.md
    paths:
      - src/database/**
      - src/models/**
    tags:
      - database
      - orm
      - prisma
    aliases:
      - db
      - storage
    entrypoints:
      - connect
      - query
      - transaction
    main_symbols:
      - DatabaseClient
      - PrismaClient
    depends_on: []
    used_by:
      - users
      - orders
      - payments
    needs_review: false
    concerns: []
    review_reasons: []
```

3. 保存文件

## 完成标准

- `_module-map.example.yaml` 包含完整的格式示例
- 示例包含 3 个模块（auth-service、users、database）
- 每个模块包含所有字段（status、doc、paths、tags、aliases、entrypoints、main_symbols、depends_on、used_by、needs_review、concerns、review_reasons）