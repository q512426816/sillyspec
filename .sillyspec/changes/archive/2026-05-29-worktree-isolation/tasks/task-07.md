---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-07
title: Wave prompt 注入 worktree 路径
priority: P0
estimated_hours: 1h
depends_on: [task-06]
blocks: []
allowed_paths:
  - src/stages/execute.js (修改)
---

# task-07: Wave prompt 注入 worktree 路径

## 修改文件（必填）
- 修改 `src/stages/execute.js`

## 实现要求
1. 修改 `buildWavePrompt` 函数，接受 `worktreePath` 参数
2. 当 worktreePath 存在时，在 Wave prompt 中注入工作目录指令
3. 前缀步骤的 worktree 输出通过某种机制传递到 Wave 步骤（通过 progress.json 的 step output 读取，或通过闭包/参数传递）

## 接口定义（代码类任务必填）

```javascript
// 修改 buildWavePrompt 函数签名：
function buildWavePrompt(wave, waveIndex, changeDir, worktreePath) {
  // wave: { index, tasks }
  // waveIndex: number
  // changeDir: string | null
  // worktreePath: string | null（新增参数）

  // 在 prompt 的适当位置注入：
  // ### 工作目录
  // 你必须在以下 worktree 中工作（子代理的 cwd 设为此路径）：
  // `<worktreePath>`
  //
  // 不要在主工作区修改源码文件。所有代码变更只在 worktree 中进行。
}
```

### 控制流伪代码
```
buildWavePrompt(wave, waveIndex, changeDir, worktreePath):
  // ... 原有逻辑不变 ...

  // 在 prompt 中插入 worktree 指令（在"任务摘要"之后、"Wave 开始前"之前）
  let worktreeSection = ''
  if (worktreePath):
    worktreeSection = `
### 工作目录
你必须在以下 worktree 中工作（子代理的 cwd 设为此路径）：
\`${worktreePath}\`

不要在主工作区修改源码文件。所有代码变更只在 worktree 中进行。
子代理的 cwd 参数设为 \`${worktreePath}\`。
`

  // 将 worktreeSection 插入 prompt
  return prompt.replace('{worktreeSection}', worktreeSection)
  // 或直接拼接

// buildExecuteSteps 中传递 worktreePath:
// 从 progress.json 的「创建 worktree」步骤 output 中提取路径
// 或从 changeDir 下读取 meta.json
export function buildExecuteSteps(planFilePath = null) {
  // ... 解析 waves ...
  // 读取 worktree meta（如果存在）
  let worktreePath = null
  if (changeDir) {
    const metaFile = path.join(changeDir, 'meta.json')  // 或从 runtime/worktrees 读取
    // ... 尝试获取 worktree 路径
  }

  const waveSteps = waves.map((wave, i) => ({
    name: `Wave ${i + 1} 执行`,
    mode: 'implementation',
    prompt: buildWavePrompt(wave, i + 1, changeDir, worktreePath),
    // ...
  }))

  return [...fixedPrefix, ...waveSteps, ...acceptanceSteps, ...fixedSuffix]
}
```

## 边界处理（必填）
- worktreePath 为 null → 不注入工作目录指令（兼容无 worktree 模式）
- worktreePath 为空字符串 → 同 null 处理
- worktree 目录实际不存在（被意外删除）→ prompt 中照常注入路径，子代理会自己发现路径无效
- 不修改传入参数

## 非目标（本任务不做的事）
- 不修改前缀步骤的创建逻辑（task-06 负责）
- 不修改后缀步骤的 apply 逻辑（task-08 负责）

## 参考
- `src/stages/execute.js` — buildWavePrompt 函数（约第 200-348 行）
- design.md §4.3 — Wave prompt 注入设计

## TDD 步骤
1. 验证 buildWavePrompt 传入 worktreePath 后，prompt 中包含工作目录指令
2. 验证 buildWavePrompt 传入 null 后，prompt 中不包含工作目录指令

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | buildWavePrompt 传入有效 worktreePath | prompt 中包含"工作目录"和路径 |
| AC-02 | buildWavePrompt 传入 null | prompt 中不包含"工作目录" |
| AC-03 | Wave prompt 子代理 cwd 指令 | 明确要求子代理 cwd 设为 worktree 路径 |
