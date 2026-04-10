# 目录结构

## .sillyspec/ 完整结构

```
.sillyspec/
├── changes/              ← 所有变更（design/proposal/tasks/requirements）
│   └── <change-name>/
│       ├── design.md          # 设计文档（架构决策、文件变更清单）
│       ├── proposal.md        # 变更提案（动机、范围、成功标准）
│       ├── requirements.md    # 需求文档（功能需求、用户场景）
│       ├── plan.md            # 实现计划总览（PM 视角，任务列表 + Wave 划分）
│       └── tasks/             # 任务蓝图目录
│           ├── task-01.md     # 独立任务蓝图（接口定义、边界处理、TDD 步骤、验收标准）
│           ├── task-02.md
│           └── ...
├── docs/                 ← 统一文档中心
│   └── <project>/
│       └── scan/         ← 代码扫描结果
│           ├── CONVENTIONS.md   # 代码规范
│           └── ARCHITECTURE.md  # 架构文档
├── knowledge/            ← 知识库（归档沉淀）
│   ├── INDEX.md          # 知识索引
│   └── uncategorized.md  # 未分类知识
├── projects/             ← 子项目注册（*.yaml）
├── local.yaml            ← 本地配置（构建命令、测试命令、环境变量）
└── .runtime/             ← 运行时数据
    ├── progress.json     ← 唯一进度数据源
    ├── artifacts/        ← 步骤输出完整内容
    ├── logs/             ← 日志
    └── history/          ← 历史快照
```

## 文档层级

| 文档 | 谁写 | 回答什么 | 详细程度 |
|------|------|---------|---------|
| design.md | brainstorm（架构师） | 为什么这么设计？架构长什么样？ | 中 |
| plan.md | plan（项目经理） | 做哪些任务？什么顺序？ | 低（总览） |
| task-N.md | plan（项目经理） | 这个任务具体怎么做？ | 高（蓝图级） |
| CONVENTIONS.md | scan | 代码怎么写？风格、命名、模式？ | 高 |
| local.yaml | 用户 | 构建命令、测试命令、环境变量 | 配置 |

## 产出时机

```
brainstorm → design.md + proposal.md + requirements.md + tasks.md
plan       → plan.md + tasks/task-NN.md
execute    → 代码 + 勾选 task-N.md 验收标准
verify     → 对照 design.md + 检查 task-N.md 验收 + 测试
archive    → 沉淀到 knowledge/
```

## 说明

- **changes/** — 所有变更规范统一存放
- **tasks/** — 每个任务独立蓝图，execute 子代理只读自己的蓝图就能干活
- **projects/** — 管理多个子项目
- **docs/** — 文档中心，主要存放代码扫描结果
- **knowledge/** — 归档沉淀的可复用知识
- **local.yaml** — 项目特有的构建/测试命令，所有阶段都会读取
- **.runtime/** — 运行时数据，progress.json 是唯一进度数据源
