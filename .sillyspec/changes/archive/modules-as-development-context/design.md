# modules-as-development-context — 设计

author: qinyi
created_at: 2026-05-28 12:43:00

## 设计决策

### D1: 统一的模块文档加载描述模板

四个阶段都需要加载模块文档，使用同一套操作描述，避免重复编写：

```
### 模块文档加载
1. 读取 `.sillyspec/docs/<project>/modules/_module-map.yaml`（不存在则跳过）
2. 根据 <匹配依据> 匹配涉及的模块
3. 读取匹配到的 `.sillyspec/docs/<project>/modules/<module>.md`
4. 将模块文档作为开发上下文的一部分
```

匹配依据因阶段而异：
- propose: proposal 初步内容中的变更范围
- plan: design.md 的文件变更清单
- execute: plan.md 的任务文件路径
- verify: design.md 的文件变更清单

### D2: propose 阶段的冲突提示方式

不实现自动化冲突检测（太复杂且不可靠），而是在 prompt 中增加一条指引：

"如果发现 proposal 中的变更范围与某个模块文档描述的当前设计存在潜在冲突，在提案中明确标注并说明处理方案。"

由 AI 自行判断，不强制中断。

### D3: verify 阶段的模块文档检查方式

在现有的"对照设计检查"步骤中追加一个检查维度：

"实现是否符合受影响模块的模块文档描述？特别关注接口签名、数据流、依赖关系是否与模块文档一致。"

不符合时标记 ⚠️，不阻断验证（因为模块文档可能未及时更新）。

### D4: _module-map.yaml 不存在时的降级

与第一阶段一致：所有阶段在 _module-map.yaml 不存在时跳过模块文档加载，不中断流程。

## 文件变更清单

### 修改
| 文件 | 变更说明 |
|------|----------|
| `src/stages/propose.js` | "加载上下文"步骤 prompt 增加模块文档读取 + 冲突提示 |
| `src/stages/plan.js` | "加载上下文"步骤 prompt 增加模块文档读取 |
| `src/stages/execute.js` | "加载上下文"步骤 prompt 增加模块文档读取 + 遵循接口约定 |
| `src/stages/verify.js` | "加载规范并锚定"步骤增加模块文档读取；"对照设计检查"步骤增加模块文档验证 |

### 不变
| 文件 | 原因 |
|------|------|
| `src/stages/archive.js` | 第一阶段已完成 |
| `src/stages/scan.js` | 第一阶段已完成 |
| `src/stages/quick.js` | 第一阶段已完成 |
| `src/stages/brainstorm.js` | 太早期，无明确模块影响范围 |
| `src/progress.js` | 步骤数量不变 |
| `src/run.js` | 无需修改 |

## 代码风格参照

与第一阶段一致：仅修改 prompt 文本，不改代码逻辑。
