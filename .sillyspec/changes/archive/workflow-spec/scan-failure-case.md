---
author: qinyi
created_at: 2026-06-03T10:50:00+08:00
doc_type: failure-case
---

# Scan 子代理落盘失败案例

## 场景

scan 阶段使用 4 个子代理并行生成 7 份扫描文档。

## 失败现象

- 子代理 A（arch）和 B（conventions）报告"完成"，但目标文件未落盘
- 子代理 C（structure）和 D（quality）正常落盘
- 失败率：2/4（50%）

## 失败模式

```
子代理执行 grep 搜索 → 生成文档内容 → 报告"已完成"
                                            ↓
                                    文件未写入磁盘（write 工具未调用）
                                            ↓
                                    主 agent 无法发现
```

可能原因：
1. 子代理认为"生成内容并汇报"等于"完成任务"，未调用 write 工具
2. 子代理沙箱环境下 write 工具的路径解析失败
3. 子代理在输出内容后 session 结束，write 操作未完成

## 修复手段

### 已实施

- **Workflow post_check**：scan step 5 完成后自动检查每个角色的 output 文件是否存在、非空、包含必要章节
- **按角色定位失败**：检查报告精确到 `role_id + 文件路径 + 失败原因`
- **重试 prompt 自动生成**：携带失败证据，只重试失败角色

### 待实施

- `no_placeholder` 检查类型：过滤"待补充"/"TODO"/"根据项目情况"等 AI 水文
- 子代理 prompt 中强制要求 write + read 确认步骤

## 对 Workflow Spec 设计的影响

此案例是 workflow spec 存在的核心证据：

> 完成状态由检查器判定，不由 agent 自述判定。

这个判断直接来自实测数据，不是理论推导。
