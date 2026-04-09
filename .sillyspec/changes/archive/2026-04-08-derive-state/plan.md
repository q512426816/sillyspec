# deriveState 状态推导 — 实现计划

author: qinyi
created_at: 2026-04-08 07:12:00

## Wave 1（核心，无依赖）

- [ ] 实现 derive.js 核心函数
  - 新增: `src/derive.js`
  - 步骤:
    1. 实现 `deriveState(cwd, options)` 纯函数
    2. 实现 artifacts 文件名解析（`{stage}-step{N}-{timestamp}.txt`）
    3. 实现 light/full 模式扫描逻辑
    4. 实现安全修复策略（issues 分类 + fix 逻辑）
    5. 验证: 在 sillyspec 项目上手动创建测试 artifacts，运行 `node -e "import('./src/derive.js').then(m => console.log(m.deriveState(process.cwd(), {mode:'full'})))"` 确认输出

## Wave 2（集成，依赖 Wave 1）

- [ ] 集成 run.js --done 轻量校验
  - 修改: `src/run.js`
  - 参考: `completeStep` 函数末尾
  - 步骤:
    1. 在 completeStep 末尾 import 并调用 deriveState(cwd, {mode:'light', fix:true})
    2. 有修复时输出警告信息
    3. 验证: 运行 brainstorm 完成 --done，确认无报错

- [ ] 扩展 validate 支持 --deep
  - 修改: `src/progress.js`
  - 参考: `validate()` 方法
  - 步骤:
    1. validate 方法加 deep 参数
    2. deep=true 时调用 deriveState(cwd, {mode:'full', fix:true})
    3. 验证: `sillyspec progress validate --deep` 确认输出校验结果

- [ ] CLI parse --deep 参数
  - 修改: `src/index.js`
  - 参考: progress 子命令的参数解析
  - 步骤:
    1. 在 progress validate 命令中解析 --deep flag
    2. 传递给 validate 方法
    3. 验证: `sillyspec progress validate --deep` 确认 flag 生效

## Wave 3（集成，依赖 Wave 1）

- [ ] 集成 doctor.js 全量扫描
  - 修改: `src/stages/doctor.js`
  - 参考: doctor 第一步（SillySpec 内部检查）的 prompt
  - 步骤:
    1. 在第一步 prompt 中加入 deriveState 全量扫描指令
    2. 将 issues 列表纳入自检报告
    3. 验证: `sillyspec run doctor` 确认第一步输出包含状态一致性检查
