# deriveState 状态推导 — 提案

author: qinyi
created_at: 2026-04-08 07:11:00

## 动机

当前 progress.json 是 sillyspec 唯一的状态数据源。AI 崩溃或异常中断时，progress.json 可能与实际产出不一致（artifacts 已生成但步骤未标记完成）。需要从文件系统反推状态，交叉校验。

## 变更范围

- 新增 `src/derive.js`（状态推导纯函数）
- 修改 `src/run.js`（--done 轻量校验）
- 修改 `src/stages/doctor.js`（全量扫描）
- 修改 `src/progress.js`（validate --deep）
- 修改 `src/index.js`（parse --deep 参数）

## 不在范围内

- 不改 progress.json 数据结构
- 不引入新依赖
- 不自动删除 progress 中有但 artifacts 无的步骤

## 成功标准

1. `--done` 完成步骤时自动校验并修复当前步骤
2. `doctor` 输出全量状态一致性报告
3. `sillyspec progress validate --deep` 可手动触发全量校验
4. 所有校验通过现有测试
