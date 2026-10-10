# 合成时间线快照 — 2026-10-10-dyn-subset-nontest-runner-face

> 烤制于归档链（2026-10-10T07:55:50.784Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-10-dyn-subset-nontest-runner-face — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
15:28:13  🁢 变更诞生（工件 frontmatter created_at）
15:28:17  📄 design.md 出现
15:28:17  📄 tasks.md 出现
15:30:44  📝 requirements.md 内容变更
15:31:11  📝 design.md 内容变更
15:31:20  📝 tasks.md 内容变更
15:36:55  ⚠️ scope-drift  声明面之外的代码文件被改：.fix1-probe7.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
15:38:53  ✅ checked 0→1
15:38:56  📝 tasks.md 内容变更
15:38:56  ✅ checked 0→1
15:39:39  ⚠️ scope-drift  声明面之外的代码文件被改：.fix2-batches.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
15:39:58  ✅ checked 1→2
15:39:58  📝 tasks.md 内容变更
15:39:58  ✅ checked 1→2
15:40:36  ⚠️ scope-drift  声明面之外的代码文件被改：.fix3-tests.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
15:41:14  ✅ checked 2→3
15:41:15  📝 tasks.md 内容变更
15:41:15  ✅ checked 2→3
15:43:10  ⚠️ scope-drift  声明面之外的代码文件被改：test/deps-cwd-prefix.test.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
15:43:27  ⚠️ scope-drift  声明面之外的代码文件被改：test/fr-regress-cap-drop.test.mjs——范围漂移嫌疑（并行会话改动/越…
15:43:36  ⚠️ scope-drift  声明面之外的代码文件被改：test/residual-runner-parity.test.mjs——范围漂移嫌疑（并行会话改…
15:45:03  ✅ checked 3→4
15:45:04  📝 tasks.md 内容变更
15:45:04  ✅ checked 3→4
15:45:25  🔀 e11f8205  fix(verify): 动态子集非测试文件拆批+探针7测试路径锚定口径——治 node --test 直跑 …
15:47:02  📝 design.md 内容变更
15:47:24  ✅ checked 4→5
15:47:25  📝 tasks.md 内容变更
15:47:25  ✅ checked 4→5
15:47:42  🔀 873a6dbc  docs(change): design 四问锚文本恢复（答案下置）+ task-05 勾格 (2026-10…
15:47:52  · 门实测 skipped（11.9s） · 20261010074752
15:49:00  📝 design.md 内容变更
15:49:07  🔀 58257512  docs(change): 文件变更清单拆行（三测试件独立声明，收口对账） (2026-10-10-dyn-s…

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
（计数链中段断裂——断裂点后勾选时刻推断不可用，标 ?）
（已勾任务缺推断时刻——观测盲窗/水位丢失，标 ?）
task-01  ≈15:38:53   收紧 isProbe7TestPath（src/verify-probes.js:17…  e11f8205
task-02  ?           buildDepsBatches（src/verify-postcheck.js）非测…  e11f8205
task-03  ?           新增 test/probe7-testpath-anchor.test.mjs 边界表…  e11f8205
task-04  ?           既有测试面回归（verify-probes / verify-postcheck / …  e11f8205
task-05  ?           显式 pathspec 提交交付文件（src 2 件 + test 2 件 + tas…  873a6dbc

墙钟：20min｜事件 32 条｜提交 3｜任务 5/5 勾选
阶段墙钟：design 20min｜tasks 19min｜requirements 0s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。