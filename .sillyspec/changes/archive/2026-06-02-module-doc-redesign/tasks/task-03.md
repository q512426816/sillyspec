---
author: qinyi
created_at: 2026-06-02 23:27:03
---

# task-03: 更新 Scan 阶段 Step 9/10 prompt（生成 flows/glossary，可选）

## 目标

更新 Scan 阶段 Step 9/10 的 prompt，使其能够生成可选的 flows/ 和 glossary.md 文档。

## 操作步骤

1. 打开 `src/stages/scan/09-generate-flows-glossary.md`
2. 按照以下格式更新 prompt：

```markdown
⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。

### flows/ 目录
目标目录：`.sillyspec/docs/sillyspec/flows/`

根据 _module-map.yaml 中的模块依赖关系，识别跨模块业务流程：
1. 读取 `_module-map.yaml`，分析 used_by 链条
2. 用 grep/rg 搜索路由定义、API 端点、事件处理
3. 识别跨模块的完整业务流程（如登录→下单→支付）
4. 每个流程生成一个文件：`flows/<flow-name>.md`

文件格式：
```markdown
# <flow-name>

## 目标
（一句话描述这个流程的业务目的）

## 参与模块
- module-a：做什么
- module-b：做什么

## 流程摘要
```text
step1 → step2 → step3
```

## 失败回滚
| 失败点 | 处理 |
|---||
```

### glossary.md
目标文件：`.sillyspec/docs/sillyspec/glossary.md`

提取项目专有术语：
1. 用 grep 搜索 TODO/FIXME 注释中的术语定义
2. 从数据库表注释提取
3. 从 README 和文档中提取定义段落

文件格式：
```markdown
# Glossary

## Session
在本项目中，session 指...（项目内特殊含义）

## Order
订单主实体，代表...（业务定义）
```

### 操作
1. 分析模块依赖关系，识别可能的业务流程
2. 如果发现 2+ 个跨模块流程，生成 flows/ 文档
3. 提取术语生成 glossary.md
4. 如果没有明显的流程或术语，跳过此步
```

3. 保存文件

## 完成标准

- `src/stages/scan/09-generate-flows-glossary.md` 包含 flows/ 和 glossary.md 格式说明
- prompt 明确说明这一步是可选的
- prompt 包含跳过的条件判断