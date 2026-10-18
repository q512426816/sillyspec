---
author: flow-machine-draft
created_at: 2026-10-18T03:09:27.361Z
---
# 需求规格（Requirements）— 2026-10-18-runtime-relayout

## 功能需求

### FR-01: .runtime 根目录不再新增按 change 命名的散文件：8 类产品写入点全部改写入 state/ 子目录（文件名保持不变，仅加目录前缀）

- 产品代码必须把全部按 change 命名的运行时散文件（sync-docs-lastpush- / draft-ledger- / route-hindsight-baseline- / watcher-events- / watcher-stage-timing- / watcher-last-snapshot- / test-rerun- / test-ledger- / ceremony-tier- / stage-session-ledger- / verify-draft- / review-dispatch-shadow- / current-stage-review-run-id- / execute-cleanup- / friction-tally- / apply-pathspec- / prompt-inject- / verify-quality-scan- / verify-result-hwm-，共 19 类）写入 `.runtime/state/` 子目录；文件名必须保持原样（仅目录前缀变化）；禁止任何新的按 change 命名文件直接落在 `.runtime` 根目录。

#### 场景：新写入落 state/

- Given：任一仓库已安装新版本 sillyspec
- When：任一命令触发上述 19 类文件中任意一类的写入（如 flow start 拉起 watcher 事件流、task tick 写 draft-ledger）
- Then：产物出现在 `<specBase>/.runtime/state/<原文件名>`，根目录不出现同名新文件

### FR-02: 可随时删除的产物（日志、db 备份、锁残留 tmp）统一写入 temp/ 子目录，删除 temp/ 内容后各流程功能不受影响

- 产品代码必须把可随时删除的运行时产物——watcher.log、spec-sync-bg.log、audit.log、sillyspec.db.bak、sillyspec.db.corrupt-*、sillyspec.db.pre-import-*、watcher.lock.*.tmp，以及可再生的全局单例产物（doctor-diagnosis.json、flow-telemetry.jsonl、write-audit.jsonl、anon-session-warn.json、selfref-pointer-warn.json、auto-pull-throttle.json）——写入 `.runtime/temp/` 子目录；删除 `.runtime/temp/` 目录全部内容后，必须不影响任何命令的后续执行正确性（这些产物必须无不可再生的状态语义：日志可丢、备份可丢、锁 tmp 可丢、活跃锁 watcher.lock 不迁）。

#### 场景：删除 temp/ 后功能不受影响

- Given：仓库存在 `.runtime/temp/` 且含 watcher.log 与 db 备份
- When：用户整体删除 `.runtime/temp/` 目录后正常运行任一命令（如 flow status、task tick）
- Then：命令正常完成，不因 temp/ 缺失而报错；后续写入自动重建 temp/

### FR-03: 变更归档/删除时同步回收该变更在 state/ 下的全部散文件（pruneArchivedChangeRuntime 扩名单），不再随归档数累积

- 变更归档或删除时，pruneArchivedChangeRuntime 必须回收该变更在 `.runtime/state/` 下的全部 19 类散文件（精确文件名匹配，禁 glob）；必须同时保留根目录旧位置同名文件的回收（未迁移旧仓兜底）；回收失败必须单条跳过不连坐（沿用既有契约）。

#### 场景：归档回收 state/ 散文件

- Given：`.runtime/state/` 下存在某活跃变更的 draft-ledger-<change>.json、watcher-events-<change>.jsonl 等多类文件
- When：该变更完成归档（或 change delete）
- Then：`.runtime/state/` 下该变更命名的全部散文件被移除，其他变更的文件不受影响

### FR-04: 旧布局兼容：升级后旧位置文件自动迁移到新位置（幂等、fail-open），既有仓库不丢状态

- 新版本必须在 CLI 入口对 `.runtime` 执行一次布局迁移：把根目录下已知家族的旧位置文件移动到 state/ 或 temp/ 对应位置；迁移必须幂等（重跑零副作用：目标已存在则跳过，不覆盖新文件）；必须 fail-open（任一文件移动失败跳过不阻断命令）；禁止迁移未知归属的文件（用户/工具自置文件不动）；迁移后旧位置读点必须不再产生新读取遗漏（全部读写点同版本切换）。

#### 场景：旧仓升级自动迁移

- Given：某仓库 `.runtime` 根目录存在旧布局的 draft-ledger-<active-change>.json 与 watcher.log
- When：用户升级 sillyspec 后运行任一 CLI 命令
- Then：文件被移动到 `.runtime/state/draft-ledger-<active-change>.json` 与 `.runtime/temp/watcher.log`，命令本身正常完成；再次运行命令不再发生任何移动

### FR-05: 本仓 .sillyspec/.runtime 完成迁移：根目录只剩核心单例与子目录，条目数从 1649 降至 30 以内

- 本仓 `.sillyspec/.runtime` 根目录在变更完成后必须只含真正的核心单例（sillyspec.db 及其 schema 标记、watcher 活跃锁、agent-session-log、global/spec-version、平台契约的 user-inputs.md）与子目录；按 change 命名的散文件、无 change 归属的全局面账本/标记单例（friction/deleted/knowledge 台账、spec-sync 标记、scan 守卫等 16 件）必须归入 state/；可再生单例产物（doctor 诊断快照、遥测/审计流水、告警标记、auto-pull 节流戳等 6 件）必须归入 temp/；一次性遗留物归置 temp/；根目录总条目数（含子目录）必须 ≤30（用户 2026-10-18 复核反馈：50 条目仍多）。

#### 场景：本仓清理验收

- Given：变更前本仓 `.runtime` 根目录有 1649 个条目；一轮迁移后 50 条目（用户判仍多）
- When：全局面单例归位（state/ 16 件 + temp/ 6 件）+ 遗留物归置完成
- Then：根目录总条目数 ≤30（`ls .sillyspec/.runtime | wc -l` 验收），且 `sillyspec flow status` 等命令对本仓正常工作

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/runtime-relayout.test.mjs「写入点产物落 state/ 子目录」
FR-02: test/runtime-relayout.test.mjs「日志与备份产物落 temp/ 子目录且删除不阻断」
FR-03: test/runtime-relayout.test.mjs「pruneArchivedChangeRuntime 回收 state/ 全家族并保留根路径兜底」
FR-04: test/runtime-relayout.test.mjs「旧布局迁移幂等且 fail-open」
FR-05: 不适用：一次性本仓清理操作（运行产品迁移 + 人工归置历史遗留物），验收以根目录计数命令输出与命令冒烟为证据，无可自动化断言面
