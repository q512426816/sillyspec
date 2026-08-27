
## ql-20260827-001-643a | 2026-08-27 23:56:54 | quick prose 参数 MSYS 路径转换污染嗅探告警
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（MSYS 嗅探纯函数+告警出口+三处解析点接线）
- test/quick-msys-path-sniff.test.mjs（纯函数 7 例+CLI 冒烟 5 例）
- docs/sillyspec/troubleshooting.md（第 44 条坑记录）
- docs/sillyspec/platform-interface-map.md（docs check --fix 行号重锚）
- docs/sillyspec/prompt-control-debt.md（docs check --fix 行号重锚）
- docs/sillyspec/architecture-4a.md（docs check --fix 行号重锚）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（docs check --fix 行号重锚）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引补 ql-20260827-001-643a）
需求：quick prose 参数 MSYS 路径转换污染嗅探告警
根因：Git Bash(MSYS2) 把以 / 开头的参数展开成 <Git 安装目录>/… 后才传入 CLI，--req "/sessions 页修复" 无感落盘成 "E:/Software/Git/sessions 页修复" 并推送平台列表（坑 quick-req-msys-path-mangling）
方案：command.js 新增 looksLikeMsysMangledPath 纯函数（盘符路径开头+紧随空白中文正文启发式）+ warnMsysMangledFlag 出口，接线 --output/四字段/--input 三处解析点，命中 stderr 告警不阻断
结果：npm test 321 文件 0 失败（新增 12 断言）；lint 428 文件通过；docs check 509/509 全绿（--fix 重锚 16 处行号漂移）

## ql-20260828-001-b050 | 2026-08-28 01:54:28 | verify 测试对账通过行误判修复——known_failures 假阳性淹没
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（通过行剔除+× 标记+vitest 汇总行识别）
- test/verify-postcheck-known-failures.test.mjs（4 组回归断言）
- docs/sillyspec/troubleshooting.md（第 45 条坑记录）
- docs/sillyspec/prompt-control-debt.md（docs check --fix 行号重锚）
- .sillyspec/docs/sillyspec/modules/core-engine.md（变更索引补 ql-20260828-001-b050）
需求：verify 测试对账通过行误判修复——known_failures 假阳性淹没
根因：PER_TEST_FAIL_RE 的 FAILED/error:/exception 是子串匹配，vitest 通过行用例名恰含这些字样（如「超时后 syncStatus=failed」带 ✓ 前缀）即被误判失败行——2710 用例套件 382 个失败行中 378 假阳性，known_failures 无法逐条枚举而实质失效，verify 护栏又禁改测试源码形成双卡（multi-agent-platform 仓实证）
方案：partitionFailures 分类前按行首通过标记（✓/√/✔/PASS，剥 ANSI 色码后判定）剔除通过行，返回保留原文；PER_TEST_FAIL_RE 补 vitest × 失败标记；SUMMARY_LINE_RE 补 vitest 无冒号汇总行
结果：npm test 321 文件 0 失败（新增 4 组回归 33 断言全绿）；lint 428 文件通过；docs check 509/509 全绿

## ql-20260828-002-b3fa | 2026-08-28 02:06:22 | verify 对账补修：vitest 控制台捕获噪声行剔除
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（4 类噪声行剔除）
- test/verify-postcheck-known-failures.test.mjs（噪声 fixture 回归）
- docs/sillyspec/prompt-control-debt.md（行号重锚）
需求：verify 对账补修：vitest 控制台捕获噪声行剔除
根因：首轮修复（f2a3965）只剔了 ✓ 通过行，真实全量输出实测仍余 373 行假阳性——155 条 stderr|捕获横幅（用例名含 failed 字样）+ 218 条 jsdom Not implemented 环境警告（error: 命中）
方案：CONSOLE_CAPTURE_RE 剔 stdout/stderr|横幅行；ENV_NOISE_RE 剔 Not implemented: 警告（i 标志修大写 N 失配）；SUMMARY_LINE_RE 增 Failed Tests 分节头与 ELIFECYCLE 退出横幅；补噪声 fixture 回归
结果：真实输出端到端：2710 用例套件失败行 382→15，7 条语义化豁免 remaining=0；npm test 321 文件 0 失败（34 断言）；lint 通过；docs check 509/509
