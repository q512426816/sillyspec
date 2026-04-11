# 各阶段文件读写一览

| 阶段 | 📥 读取 | 📤 产出 |
|------|---------|---------|
| **brainstorm** | CODEBASE-OVERVIEW.md<br>projects/*.yaml<br>local.yaml<br>STRUCTURE.md（棕地）<br>CONVENTIONS.md（棕地）<br>ARCHITECTURE.md（棕地）<br>changes/（进行中）<br>~/.sillyspec/templates/ | design.md<br>proposal.md<br>requirements.md<br>tasks.md |
| **plan** | CODEBASE-OVERVIEW.md<br>proposal.md<br>design.md<br>requirements.md<br>tasks.md<br>CONVENTIONS.md<br>ARCHITECTURE.md<br>STACK.md<br>local.yaml | plan.md（总览）<br>tasks/task-NN.md（蓝图） |
| **execute** | design.md<br>plan.md<br>tasks/task-NN.md（CLI 自动注入）<br>CONVENTIONS.md（按需）<br>ARCHITECTURE.md（按需）<br>local.yaml<br>CODEBASE-OVERVIEW.md<br>knowledge/INDEX.md | 代码文件<br>勾选 task-N.md + plan.md checkbox |
| **verify** | proposal.md<br>design.md<br>tasks.md<br>requirements.md<br>projects/*.yaml<br>local.yaml<br>CONVENTIONS.md<br>tasks/task-NN.md | 验证报告<br>可能更新 design.md（Reverse Sync） |
| **quick** | projects/*.yaml<br>CONVENTIONS.md<br>local.yaml<br>knowledge/INDEX.md<br>design.md（有 --change） | 代码文件<br>tasks.md（有 --change）<br>QUICKLOG |
| **scan** | projects/*.yaml<br>已有 scan/*.md<br>package.json / pom.xml 等<br>源文件（grep 搜索） | ARCHITECTURE.md<br>CONVENTIONS.md<br>STRUCTURE.md<br>INTEGRATIONS.md<br>TESTING.md<br>CONCERNS.md<br>PROJECT.md |
| **archive** | tasks.md<br>changes/<变更名>/ 目录下文件 | archive/YYYY-MM-DD-<变更名>/（移动）<br>更新 progress.json |
| **doctor** | progress.json<br>projects/*.yaml<br>local.yaml<br>MCP 配置<br>构建文件 | 无（只检查报告） |

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
