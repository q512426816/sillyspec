---
id: task-03
title: '门禁梯度（src/run/gates.js + src/verify-probes.js）——--done 预填注未删 advisory；归档前注清零 error（探针面）；定向回归'
title_zh: '门禁梯度（src/run/gates.js + src/verify-probes.js）——--done 预填注未删 advisory；归档前注清零 error（探针面）；定向回归'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 23:50:25
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/run/gates.js
  - src/verify-probes.js
target_files:
  - src/run/gates.js
  - src/verify-probes.js
goal: >
  给预填注建立 advisory→error 门禁梯度——--done 提示未确认、归档前阻断注未清零，落实预填≠结论。
implementation:
  - src/run/gates.js：--done 门（brainstorm/plan）对白名单槽含未删预填注记 advisory warning（不阻断——忘删注=未确认提示）；检测复用 hasUnconfirmedPrefill
  - src/verify-probes.js：归档前预填注清零校验（error 级）挂 --init 探针面——注在场=预填未确认，阻断归档
  - 定向回归 gates 与 verify-probes 既有测试
acceptance:
  - --done 门双态：白名单槽注在场 → advisory 提示不阻断；注删净 → 无提示通过
  - 归档前校验双态：注在场 → verify-probes error 阻断；注删净 → 通过
  - 旧路径零新硬门：无预填注的既有变更 --done/归档行为不变（定向回归绿）
verify:
  - npm test
  - npm run lint
constraints:
  - --done 门仅 advisory 不阻断（旧路径零新硬门）；error 只挂归档前校验
  - 只检测白名单槽的预填注，不误伤产物中普通行内注释
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     门禁梯度：--done advisory+归档前注清零 error / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
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
