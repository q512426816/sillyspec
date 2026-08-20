# modules-as-development-context — 任务

author: qinyi
created_at: 2026-05-28 12:43:00

## 1. propose 阶段模块文档加载
- [ ] `src/stages/propose.js` — "加载上下文"步骤 prompt 增加模块文档读取操作
- [ ] 根据 proposal 初步内容匹配 _module-map.yaml 中的模块
- [ ] 加载匹配到的模块文档
- [ ] 在 prompt 中增加设计冲突提示指引

## 2. plan 阶段模块文档加载
- [ ] `src/stages/plan.js` — "加载上下文"步骤 prompt 增加模块文档读取操作
- [ ] 根据 design.md 文件变更清单匹配模块
- [ ] 加载匹配到的模块文档作为计划上下文

## 3. execute 阶段模块文档加载
- [ ] `src/stages/execute.js` — "加载上下文"步骤 prompt 增加模块文档读取操作
- [ ] 根据 plan.md 任务文件路径匹配模块
- [ ] 加载匹配到的模块文档，提醒遵循接口约定和依赖关系

## 4. verify 阶段模块文档验证
- [ ] `src/stages/verify.js` — "加载规范并锚定"步骤增加模块文档读取
- [ ] "对照设计检查"步骤增加模块文档一致性检查项
- [ ] 不符合时标记 ⚠️

## 5. 降级处理
- [ ] 四个阶段的模块文档加载均支持 _module-map.yaml 不存在时跳过

## 6. 验证
- [ ] 确认四个阶段的 prompt 中模块文档加载描述一致
- [ ] 确认不影响现有步骤逻辑
- [ ] 确认 _module-map.yaml 不存在时正常降级
