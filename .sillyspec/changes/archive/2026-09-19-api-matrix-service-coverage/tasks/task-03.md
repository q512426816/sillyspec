---
id: task-03
title: 'probe7 anchor precheck recognizes covered-service'
title_zh: '预检器——src/probe7-anchor-check.js :70/:72 认 covered-service'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 06:32:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/probe7-anchor-check.js
target_files:
  - src/probe7-anchor-check.js
goal: >
  advisory 预检器 probe7-anchor-check 认第五枚举 covered-service——:70 硬编码四枚举数组加入新值、:72 认定同 covered（计 coveredRows 并进三形态锚点校验）。否则 covered-service 行被预检静默跳过、直撞 verify --done 硬 error，「省一轮往返」立意失效（design Grill U-02）。
implementation:
  - 步骤一（:70 枚举数组，design Wave2.5 前半）：src/probe7-anchor-check.js :70 过滤数组 ['covered', 'partial', 'uncovered', 'non-testable'] 加入 'covered-service'——covered-service 行计入 rowsChecked，预检不再静默跳过。
  - 步骤二（:72 认定同 covered，design Wave2.5 后半）：:72 条件 if (verdict !== 'covered') continue 改 if (verdict !== 'covered' && verdict !== 'covered-service') continue——covered-service 行计入 coveredRows 并落进 :78 三形态锚点校验（ANCHOR_RE file:line / .test. 文件名 / BACKTICK_RE 反引号），缺锚进 missingAnchors advisory 提示回补。
  - 步骤三（注释口径同步）：:7 头注释「判定列=covered 的行」口径句与 :23「只查 covered」边界句补 covered-service；:38「判定枚举纯值（骨架四枚举…）」改五枚举——与 renderProbe7Lines 骨架注记同源（task-02 改后口径）。
acceptance:
  - checkProbe7AnchorCoverage 对含 covered-service 行的合成探针 7 段——rowsChecked 计入该行（不再被 :70 过滤跳过）。
  - covered-service 行证据含锚点（如 test/foo.test.mjs:42）——不进 missingAnchors 且 coveredRows 计入该行。
  - covered-service 行证据缺锚点（纯文本无 file:line / .test. / 反引号）——missingAnchors 含该行（advisory 回补提示，先于 verify --done 硬 error 一轮）。
  - partial/uncovered/non-testable 行仍被 :72 跳过（不进锚点校验、不进 coveredRows）——既有行为零变化。
  - node --check src/probe7-anchor-check.js 通过；文件内「四枚举」字样清零（:38 已同步五枚举口径）。
verify:
  - node --check src/probe7-anchor-check.js（语法冒烟）
  - node -e 定向冒烟（不跑全量，收口归 task-04）——内联 import('./src/probe7-anchor-check.js') 取 checkProbe7AnchorCoverage，喂最小合成 verify-result.md 文本（covered-service 行有锚/无锚两态 + partial 行对照）断言 acceptance 第 1-4 条
constraints:
  - 存量四枚举行为逐字不变——:70 数组扩展是纯增量，partial/uncovered/non-testable 跳过逻辑不动（plan 全局硬约束第 1 条）。
  - advisory 定位不升级——缺锚只进 missingAnchors（warn 回补提示），不得改 error/阻断语义（模块头注释「advisory 不阻断」边界不动）。
  - 复用既有 ANCHOR_RE / BACKTICK_RE / .test. 三形态口径，零新正则零路径拼接（第 8 条）。
  - 零 facts schema 变更（第 3 条）。
  - 本卡只动 src/probe7-anchor-check.js 单文件，不改 test/——断言收口归 task-04。
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
