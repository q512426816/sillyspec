# deriveState 状态推导

author: qinyi
created_at: 2026-04-08 07:10:00

## 背景

当前 sillyspec 的状态管理依赖 `progress.json` 作为唯一数据源。如果 AI 崩溃或异常中断，progress.json 可能与实际产出不一致（如 artifacts 文件已生成但步骤未标记完成）。

借鉴 GSD v2 的 deriveState 架构，从文件系统反推状态，与 progress.json 交叉校验。

## 需求

1. `--done` 完成步骤时轻量校验当前步骤
2. `doctor` 自检时全量扫描所有阶段
3. `progress validate --deep` 支持手动触发全量校验
4. 安全修复策略：明显正确的情况自动修复，有歧义的不动

## 设计

### 新增文件：`src/derive.js`

纯函数模块，零外部依赖（仅 fs/path）。

```js
export function deriveState(cwd, options = {}) {
  // options.mode: 'light' | 'full'（默认 light）
  // options.fix: boolean（默认 false，只报告不修复）
  // 返回 { issues: [{type, severity, step, artifact, suggestion}], fixed: number }
}
```

#### 扫描逻辑

1. 读取 progress.json，获取所有阶段步骤状态
2. 扫描 `.sillyspec/.runtime/artifacts/` 目录
3. 文件名格式：`{stage}-step{N}-{timestamp}.txt`
4. 解析文件名提取 stage、stepIndex 信息
5. 对比规则：

| 情况 | 严重度 | 自动修复 |
|------|--------|----------|
| artifacts 有文件但 progress 标记未完成 | issue | ✅ 标记为 done |
| progress 标记已完成但 artifacts 无文件 | warning | ❌ 可能被手动清理 |
| artifacts 有 step5 但 progress 只到 step3 | issue | ✅ 补齐中间步骤 |

#### 模式

- **light**：只检查 currentStage 的当前步骤和前一步
- **full**：检查所有阶段所有步骤

### 集成方式

#### 1. run.js — `--done` 轻量校验

在 `completeStep` 末尾：
```js
import { deriveState } from './derive.js';
const result = deriveState(cwd, { mode: 'light', fix: true });
if (result.fixed > 0) {
  console.log(`⚠️ 状态修复：${result.fixed} 个步骤已从 artifacts 恢复`);
}
```

#### 2. doctor.js — 全量扫描

第一步（SillySpec 内部检查）调用：
```js
const result = deriveState(cwd, { mode: 'full', fix: false });
// 将 issues 加入自检报告
```

#### 3. progress.js — `validate --deep`

validate 方法支持 deep 参数：
```js
validate(cwd, deep = false) {
  // ...现有校验逻辑...
  if (deep) {
    const result = deriveState(cwd, { mode: 'full', fix: true });
    // 输出校验结果
  }
}
```

CLI：`sillyspec progress validate --deep`

## 改动范围

- 新增：`src/derive.js`（~80 行）
- 修改：`src/run.js`（2 行）、`src/stages/doctor.js`（3 行）、`src/progress.js`（5 行）、`src/index.js`（parse --deep）

## 不做的事

- 不引入 SQLite 或其他新依赖
- 不改变 progress.json 的数据结构
- 不自动删除 progress 中有但 artifacts 无的步骤（可能被手动清理）
