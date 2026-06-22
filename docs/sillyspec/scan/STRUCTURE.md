---
author: qinyi
created_at: 2026-05-13T08:38:05
---

# 目录结构

## 项目根目录
```
sillyspec/
├── bin/                    # CLI 入口
│   └── sillyspec.js
├── src/                    # 核心源码
│   ├── index.js           # CLI 主入口，命令路由
│   ├── init.js            # 项目初始化
│   ├── progress.js        # ProgressManager 状态管理
│   ├── run.js             # 阶段执行引擎
│   ├── setup.js           # 环境配置
│   ├── migrate.js         # 文档迁移
│   └── stages/            # 阶段定义
│       ├── index.js       # 阶段注册表
│       ├── brainstorm.js  # 需求探索
│       ├── propose.js     # 生成规范
│       ├── plan.js        # 编写计划
│       ├── execute.js     # 波次执行
│       ├── verify.js      # 验证实现
│       ├── scan.js        # 代码扫描
│       ├── quick.js       # 快速任务
│       ├── archive.js     # 归档变更
│       ├── status.js      # 项目状态
│       └── doctor.js      # 项目自检
├── packages/              # 子包
│   └── dashboard/         # Vue 3 可视化面板
│       ├── src/          # 前端源码
│       ├── server/       # WebSocket 服务器
│       ├── public/       # 静态资源
│       └── dist/         # 构建输出
├── .claude/               # Claude Code 技能定义
│   └── skills/           # 技能目录（20+ 技能）
├── .sillyspec/           # SillySpec 运行时
│   ├── .runtime/         # 运行时状态
│   │   ├── sillyspec.db  # SQLite 进度数据库
│   │   ├── artifacts/    # 临时产物
│   │   ├── history/      # 执行历史
│   │   ├── logs/         # 执行日志
│   │   └── templates/    # 模板文件
│   ├── projects/         # 项目配置（*.yaml）
│   ├── docs/             # 项目文档
│   ├── knowledge/        # 知识库
│   ├── plans/            # 计划文件
│   ├── changes/          # 变更归档
│   ├── shared/           # 共享资源
│   └── workspace/        # 多项目工作区
├── docs/                 # 文档输出（本项目）
│   └── sillyspec/
│       └── scan/         # 扫描文档
└── package.json          # 主包配置
```

## 模块说明

### CLI 核心模块
- `index.js`: 命令分发器，解析用户输入并调用对应阶段
- `run.js`: 阶段执行器，处理步骤推进和进度保存
- `progress.js`: 状态持久化，支持备份恢复

### 阶段定义模块
每个阶段文件导出 `definition` 对象，包含：
- `description`: 阶段描述
- `steps`: 步骤数组，每步包含 `prompt`

### Dashboard 模块
独立 Vue 3 应用，通过 WebSocket 与 CLI 通信：
- 实时显示进度
- Markdown 预览
- 文件监听自动刷新

### Claude Skills 模块
20+ 技能定义，每个技能包含 `SKILL.md`：
- 定义技能的执行流程
- 提供上下文和铁律
- 集成到 Claude Code UI
