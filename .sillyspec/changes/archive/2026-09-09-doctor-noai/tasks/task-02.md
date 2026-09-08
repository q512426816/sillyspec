---
id: task-02
title: '常量迁移 + _cliAction + 步骤重排 + 顶层改道'
title_zh: '常量迁移 + _cliAction + 步骤重排 + 顶层改道'
author: 'qinyi'
created_at: 2026-09-09 05:28:58
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/constants.js
  - src/run/stage.js
  - src/run/complete.js
  - src/stages/doctor.js
  - src/index.js
target_files:
  - src/constants.js
  - src/run/stage.js
  - src/run/complete.js
  - src/stages/doctor.js
  - src/index.js
goal: >
  可达性破局 + 阶段折叠 6→3 步 + 顶层只读改道。
implementation:
  - constants.js：doctor 移出 READONLY_AUXILIARY_STAGES（command.js:970 判据自动解除短路）
  - stage.js：注册 doctorRunDiagnostics 分支（runDoctorDiagnostics + renderDoctorSummary + writeDoctorDiagnosis 落盘）；complete.js --done noAI 分支同步注册
  - doctor.js 6→3 步：step1 noAI _cliAction doctorRunDiagnostics（综合诊断=八维+三新+模块文档健康[modules.js:324 校验复用]+决策版本漂移 CLI 可算部分）；step2 agent 修复决策与执行（消费报告，safe_actions/next_step 决策，--confirm 写操作按 D-03 独立调用）；step3 agent 汇总。bash 教学步全删
  - index.js：顶层非 --json doctor 改道直跑诊断+renderDoctorSummary（不走 runCommand/initChange/不刷 lastActive）；--json/--status 分支不动
acceptance:
  - run doctor step1 noAI 自动执行含渲染输出；bash 教学步消失
  - 顶层非 json doctor：零 initChange/零 lastActive 刷新（只读承诺）
  - doctor --status 仍直达原分支
verify:
  - node --test test/doctor-noai-fold.test.mjs
  - node bin/sillyspec.js doctor --status（行为不变冒烟）
constraints:
  - --confirm 写操作语义零变化（D-003）
  - 不触碰 scan/plan 的 _cliAction 分支
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
