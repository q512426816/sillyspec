# 统一文档管理 + Dashboard 文档浏览

## 动机

### 现状问题
1. 文档散落在各子项目的 `.sillyspec/` 里，没有统一视角
2. Dashboard 只能发现项目，看不到文档内容
3. 扫描的 `codebase/` 文档只在子项目里，主项目看不到
4. 归档后文档沉入 `knowledge/`，跨项目复用不方便
5. 单项目模式和工作区模式两套逻辑，维护成本高

### 目标
- 文档只写一份，集中管理
- 默认工作区模式，去掉模式切换
- Dashboard 支持文档浏览
- 子项目保持干净（只有源代码）

## 方案

### 核心原则
- **文档只写一份**，在哪执行就写在哪
- **默认工作区模式**，每个项目天生就是"主项目"
- **子项目不生成文档**，文档全部在主项目的 `.sillyspec/docs/<project>/` 下

### 目录结构

```
my-project/.sillyspec/
├── STATE.md                        # 主项目状态（含当前操作的项目）
├── projects/                       # 子项目注册表
│   ├── my-project.yaml             # 默认注册自己
│   ├── frontend.yaml               # { name, path, status }
│   └── backend.yaml
│
├── docs/                           # 统一文档中心
│   └── my-project/                 # 按子项目分目录
│       ├── scan/                   # scan 产出
│       │   ├── ARCHITECTURE.md
│       │   └── CONVENTIONS.md
│       ├── brainstorm/             # brainstorm 设计文档
│       │   └── 2026-04-05-user-auth.md
│       ├── plan/                   # plan 产出
│       │   └── 2026-04-05-user-auth.md
│       ├── changes/                # 当前变更（WIP）
│       │   └── user-auth/
│       │       ├── design.md
│       │       └── tasks.md
│       ├── archive/                # 归档
│       │   └── 2026-03-20-db-redesign.md
│       └── quicklog/               # quick 操作记录
│           └── 2026-04-05-fix-login.md
│
├── knowledge/                      # 跨项目共享知识库（不变）
└── .runtime/
    └── progress.json               # 运行时数据（含子项目维度）
```

### 子项目保持干净

```
frontend/                          # 只有源代码
├── src/
├── package.json
└── .gitignore
```

子项目不再有 `.sillyspec/` 目录。

## 命令变更

### --project 参数

所有产生文档的命令支持 `--project <name>` 参数：

```bash
/sillyspec:scan --project frontend
/sillyspec:brainstorm "用户认证" --project frontend
/sillyspec:plan --project frontend
/sillyspec:execute --project frontend
/sillyspec:archive --project frontend
/sillyspec:quick --project frontend --change "修复登录bug"
```

不指定 `--project` 时，默认使用 `STATE.md` 中记录的当前项目。

### 文档输出路径映射

| 命令 | 输出路径 |
|------|---------|
| scan | `.sillyspec/docs/<project>/scan/` |
| brainstorm | `.sillyspec/docs/<project>/brainstorm/<name>.md` |
| propose | `.sillyspec/docs/<project>/brainstorm/<name>.md` |
| plan | `.sillyspec/docs/<project>/plan/<name>.md` |
| execute | `.sillyspec/docs/<project>/changes/<name>/` (WIP) |
| archive | `.sillyspec/docs/<project>/archive/<name>.md` |
| quick | `.sillyspec/docs/<project>/quicklog/<name>.md` |

### init 变更

- `sillyspec init` 初始化时，`projects/` 默认注册当前目录自己
- 去掉 `--workspace` 参数（默认就是工作区模式）
- 去掉 `--interactive` 参数（默认零交互）

### STATE.md 变更

```markdown
# 项目状态

## 当前项目
- 名称：frontend
- 路径：./frontend

## 当前变更
- 名称：user-auth
- 当前阶段：execute ⏳
- 下一步：执行任务 3/8
```

### progress.json 变更

增加子项目维度：

```json
{
  "_version": 1,
  "schemaVersion": "1.0",
  "currentProject": "frontend",
  "currentStage": "execute",
  "stages": {
    "brainstorm": { "status": "completed", "steps": [...] },
    "plan": { "status": "completed", "steps": [...] },
    "execute": { "status": "in-progress", "steps": [...] },
    "verify": { "status": "pending", "steps": [] }
  }
}
```

## Dashboard 文档浏览

### 新增文档 Tab

选中项目后，中间区域顶部增加 Tab 切换：

```
[ 流水线 ] [ 文档 ]
```

### 文档 Tab 内容

左侧：文档树（按类型分组）

```
📋 设计文档
  📄 用户认证功能设计

📐 实现计划
  📄 用户认证功能计划

⚙️ 当前变更
  📄 design.md
  📄 tasks.md

📦 已归档
  📄 数据库重设计

🔍 架构文档
  📄 ARCHITECTURE.md
  📄 CONVENTIONS.md

⚡ 快速修复
  📄 修复登录bug
```

右侧：文档预览（Markdown 渲染）

点击左侧文档，右侧显示内容。

### 后端新增 API

```
GET /api/projects/:path/docs          # 获取项目文档树
GET /api/projects/:path/docs/:filePath # 获取文档内容
```

## 兼容性

- 旧项目 `.sillyspec/codebase/`、`.sillyspec/specs/` 不受影响，只是新文档不再往那写
- 可加 `sillyspec docs migrate` 命令把旧文档迁移到新结构
- Dashboard 的项目发现逻辑不变（扫描 `.sillyspec` 目录）

## 验收标准

1. `sillyspec init` 生成 `projects/` 和 `docs/` 结构
2. `--project` 参数在所有命令中生效
3. 文档输出到 `.sillyspec/docs/<project>/` 对应子目录
4. 子项目目录不生成任何 `.sillyspec` 文件
5. Dashboard 文档 Tab 能展示文档树和预览内容
6. 旧项目不受影响
7. `sillyspec docs migrate` 能迁移旧文档
