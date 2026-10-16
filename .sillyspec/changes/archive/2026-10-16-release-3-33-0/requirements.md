---
author: flow-machine-draft
created_at: 2026-10-16T02:58:13.947Z
---
# 需求规格（Requirements）— 2026-10-16-release-3-33-0

## 功能需求

### FR-01: package.json 与 package-lock.json version=3.33.0 且 test/quick-retired.test.mjs R5 锚断言同步并跑绿

- 版本面必须同步为 3.33.0：package.json 与 package-lock.json 的 version 字段一致为 3.33.0，且 test/quick-retired.test.mjs 的 R5 版本锚断言值与文案必须同步为 3.33.0，锚测试必须跑绿；随版内容=三笔已提交件（dcb62728 verify/plan/bindings/apply 四坑收口、4c3168cc 与 df5d65e4 全量门 fixture/契约防漂移）加 FR-04 漂移修复收编。

#### 场景：主路径

Given 本地 3.32.10、npm 线上 latest=3.32.10；When `npm version 3.33.0 --no-git-tag-version` 连带 lock 同步且 R5 锚断言改写；Then `node --test test/quick-retired.test.mjs` 全绿，断言「R5 package.json 版本 3.33.0」通过。

### FR-02: git push origin main 成功（pre-push 三门放行），origin/main 与本地一致

- 版本面提交与本地积压提交必须经显式 pathspec 提交后推送 origin main 成功；pre-push 门必须放行（2026-10-16 起 pre-push 降级为快速 lint + docs ratchet 两道本地门，全量测试移交 CI——.github/workflows/ci.yml，红灯阻断口径不变），被拦时禁止跳过 hook、必须修复后重推；推送前提交面必须自洽全量绿（FR-04 修复先收编，保证新 HEAD 提交面 npm test 可复现全绿）。

#### 场景：主路径

Given 版本面提交与积压提交在本地 main；When `git push origin main`；Then pre-push 本地门全绿放行，推送回执含远端哈希区间，origin/main 与本地一致，CI 全量 job 无红灯。

### FR-03: npm publish 回执含 sillyspec@3.33.0 与 shasum，传播后双核验 version=3.33.0 且 dist-tags.latest=3.33.0

- 发布前必须预核验通道存活（latest=3.32.10）；publish 回执必须含 shasum；传播后必须双核验 version=3.33.0 且 dist-tags.latest=3.33.0，任一不符即视为发布失败禁止带病收口。

#### 场景：主路径

Given npm 线上 latest=3.32.10 且 push 已完成；When `npm publish` 成功回执含 shasum；Then CDN 传播后 `npm view sillyspec version` 与 `npm view sillyspec dist-tags.latest` 均返回 3.33.0。

### FR-04: test/lint-ownership-failfast.test.mjs 3e 断言随 lint-triage-path-unify 实态改钉且该件跑绿

- 3e 断言必须随已归档变更 lint-triage-path-unify 的实态改钉：gates.js 判定已迁共享 helper lint-ownership.js（源内裸 `verdict === 'pre-existing'` 字面量已消失），断言锚必须改为 helper 调用在场（`lintOwnershipDowngrade`），且 `node --test test/lint-ownership-failfast.test.mjs` 必须跑绿——不修复则新 HEAD 提交面全量红，FR-02 的 CI 全量门必拦。

#### 场景：主路径

Given HEAD gates.js 已无 `verdict === 'pre-existing'` 字面量而测试 3e 仍钉旧锚（HEAD 全量红欠账）；When 3e 断言改钉 `lintOwnershipDowngrade` 在场；Then 该测试件 1/1 绿，提交面恢复全量绿可复现。

### FR-05: .github/workflows/ci.yml test/docs-gate 两 job 补 npm ci install 步且推送后 CI 三 job 全绿

- CI 工作流必须在 test 与 docs-gate 两 job 补依赖安装步（`npm ci`）：被测 CLI 本体 import 7 个运行时依赖（js-yaml/chalk/@inquirer/prompts 等，src 下 10+ 文件），「零三方依赖无 install 步」假设只对测试框架成立（node:test/sqlite 内置），CI 首跑实证两 job 全灭（Cannot find package 'js-yaml'）；修复必须落 main 并使 CI 恢复真实跑动能力（docs-gate 与 lint 全绿回执，test job 真实执行全量套件）。publish 全量信号口径=本地 Windows 全量绿（与 3.32.1~3.32.10 十个版本同口径）或 CI 三 job 全绿；CI Linux test job 首跑暴露的存量平台债（Windows 盘符 fixture、stderr 字节非确定比对等 ~16 例，均与本版内容无关）属 121a33ee CI 引入首次揭示的存量问题，另案清偿，不构成本版 publish 阻断。

#### 场景：主路径

Given CI 首跑（121a33ee）test 与 docs-gate 两 job 因缺依赖 3m25s 全灭；When 两 job 补 `npm ci --no-audit --no-fund` 步并推送；Then docs-gate 与 lint 两 job 全绿、test job 真实跑动全量套件（Linux 平台债暴露清单留 CI run 留痕另案），本地 Windows 全量绿承担 publish 前置全量信号。

### FR-06: test/review-material-pack.test.mjs 组四源码钉随 fbf0ada4 substituteRaw 收编实态改钉且该件跑绿

- 组四两条源码钉断言必须随已提交变更 fbf0ada4 的实态改钉：prompt.js 主链与降级分支的裸 `.split('{REVIEW_MATERIALS}').join(...)` 已收编为 `substituteRaw('{REVIEW_MATERIALS}', reviewMaterialsMd)` / `substituteRaw('{REVIEW_MATERIALS}', '')`（src/run/prompt.js:1701/1709），旧字面量在 HEAD 已消失；断言锚必须改钉 substituteRaw 调用在场，且 `node --test test/review-material-pack.test.mjs` 必须跑绿——不修复则发布面全量红（本地 Windows 全量实测 815/816 唯一失败件）。

#### 场景：主路径

Given HEAD prompt.js 两处裸 split/join 已迁 substituteRaw（fbf0ada4 漏收测试锚）而组四仍钉旧字面量；When 两条断言改钉 substituteRaw 调用；Then 该测试件 32 断言全绿，发布面恢复全量绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-retired.test.mjs「R5 版本锚 3.33.0」
FR-02: 不适用：推送动作由 pre-push 本地门（快速 lint + docs ratchet）与 CI 全量 job 客观核验，push 回执写进交付提交消息留痕，无独立测试面
FR-03: 不适用：发布回执与双核验属外部 registry 交互，回执（shasum/传播核验）写进交付提交消息留痕，registry 无本地测试面
FR-04: test/lint-ownership-failfast.test.mjs「3e verify lint 硬拦分支走共享归属鉴定降档」
FR-05: 不适用：纯 CI 配置修复（不适用：纯配置/文档不写测试），验收靠 CI 运行回执（三 job 全绿，run URL 写进交付提交消息留痕）
FR-06: test/review-material-pack.test.mjs「组四：prompt.js 主链注入目标为装配结果」
