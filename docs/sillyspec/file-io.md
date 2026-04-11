# 各阶段文件读写一览

| 阶段 | 📥 读取 | 📤 产出 |
|------|---------|---------|
| **brainstorm** | CODEBASE-OVERVIEW.md、projects/*.yaml、local.yaml、STRUCTURE.md、CONVENTIONS.md、ARCHITECTURE.md、changes/、templates/ | design.md、proposal.md、requirements.md、tasks.md |
| **plan** | CODEBASE-OVERVIEW.md、proposal.md、design.md、requirements.md、tasks.md、CONVENTIONS.md、ARCHITECTURE.md、STACK.md、local.yaml | plan.md（总览）、tasks/task-NN.md（蓝图） |
| **execute** | design.md、plan.md、tasks/task-NN.md（CLI 自动注入）、CONVENTIONS.md、ARCHITECTURE.md（按需）、local.yaml、CODEBASE-OVERVIEW.md、knowledge/INDEX.md | 代码文件、勾选 task-N.md + plan.md checkbox |
| **verify** | proposal.md、design.md、tasks.md、requirements.md、projects/*.yaml、local.yaml、CONVENTIONS.md、tasks/task-NN.md | 验证报告、可能更新 design.md（Reverse Sync） |
| **quick** | projects/*.yaml、CONVENTIONS.md、local.yaml、knowledge/INDEX.md、design.md（有 --change） | 代码文件、tasks.md（有 --change）、QUICKLOG |
| **scan** | projects/*.yaml、已有 scan/*.md、package.json/pom.xml 等、源文件（grep） | ARCHITECTURE.md、CONVENTIONS.md、STRUCTURE.md、INTEGRATIONS.md、TESTING.md、CONCERNS.md、PROJECT.md |
| **archive** | tasks.md、changes/<变更名>/ 目录下文件 | archive/YYYY-MM-DD-<变更名>/（移动）、更新 progress.json |
| **doctor** | progress.json、projects/*.yaml、local.yaml、MCP 配置、构建文件 | 无（只检查报告） |

## 全局注入（每个 step）

### Persona

| 阶段 | 角色 |
|------|------|
| brainstorm | 🎯 资深架构师 |
| plan | 📋 技术项目经理 |
| execute | 💻 高级工程师 |
| verify | 🔍 QA 专家 |
| quick | 💻 全栈老兵 |

### 铁律

1. 文档是核心资产，代码是文档的产物
2. 只做本步骤描述的操作，不得自行扩展或跳过
3. 不要回头修改已完成的步骤
4. 不要编造不存在的 CLI 子命令
5. 完成后立即执行 `--done` 命令
6. 文档类型文件头部必须包含 author 和 created_at
7. 执行构建/测试前必须先读 local.yaml
