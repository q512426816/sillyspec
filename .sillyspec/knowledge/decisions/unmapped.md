# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。
> 【2026-11-02-knowledge-status-lines】本池条目为检索面-only 停车场（语义等价 draft/exclude）——检索核心已过滤，条目仅供人工翻阅与数据对账。

## D-unmapped-173@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-pushgate-green-repair
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/changes/2026-09-27-pushgate-green-repair/design.md, .sillyspec/changes/2026-09-27-pushgate-green-repair/proposal.md, .sillyspec/changes/2026-09-27-pushgate-green-repair/requirements.md, .sillyspec/changes/2026-09-27-pushgate-green-repair/tasks.md
最近确认：eb946a2e7bf4a93671effef01ac7778043b7ba3f
理由：最大风险：行号锚是「随代码漂移的活契约」，后续提交再动 shared.js/index.js 行布局会再红——本变更只修当前态，不引入锚自愈机制（属另一变更面）。放弃的方案：给全部 17 处加 ? 后缀跳过关键词断言——被否：这批锚是真实代码引用而非纯位置叙事，跳过断言等于降低校验强度掩盖漂移。

## D-unmapped-177@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-pushgate-birth-tests-sync
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/changes/2026-09-27-pushgate-birth-tests-sync/design.md, .sillyspec/changes/2026-09-27-pushgate-birth-tests-sync/proposal.md, .sillyspec/changes/2026-09-27-pushgate-birth-tests-sync/requirements.md, .sillyspec/changes/2026-09-27-pushgate-birth-tests-sync/tasks.md
最近确认：48511fdc2075698795988139af8079b7001eb7bf
理由：最大风险：若 eb3b4bce 的放行语义后续被裁决回退（出生态不允许直入主流程），本两处断言需随语义再翻转——留锚在转换表注释。放弃的方案：直接删掉 brainstorm→execute 表行与 1a 用例——被否：删断言等于丢防护面，保留带 fromStageData 的真入门变体才守住「跳步拦截」语义。

## D-unmapped-218@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-splitgwt-direct-test
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/changes/2026-10-03-splitgwt-direct-test/design.md, .sillyspec/changes/2026-10-03-splitgwt-direct-test/flow-state.yaml, .sillyspec/changes/2026-10-03-splitgwt-direct-test/proposal.md, .sillyspec/changes/2026-10-03-splitgwt-direct-test/requirements.md, .sillyspec/changes/2026-10-03-splitgwt-direct-test/tasks.md, test/flow-draft.test.mjs
最近确认：b1bd40888408db06043d6fd6352cb1343ac3a6e9
理由：风险趋零（纯断言追加）。试过放弃：删 export 关键字改内部函数——回退批次1 design 的导出声明且丢失直测价值，放弃；补消费方是更优解。

## D-unmapped-309@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-release-3-32-4
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/changes/2026-10-10-release-3-32-4/design.md, .sillyspec/changes/2026-10-10-release-3-32-4/flow-state.yaml, .sillyspec/changes/2026-10-10-release-3-32-4/proposal.md, .sillyspec/changes/2026-10-10-release-3-32-4/requirements.md, .sillyspec/changes/2026-10-10-release-3-32-4/tasks.md, .sillyspec/changes/2026-10-10-release-3-32-4/review.json
最近确认：060a6f70e810071b6e752609a6257721fb2a0fe6
理由：最大风险：钉扎 IP 失效或 DoH 通道本身也被劫持（阿里 DoH 已沦陷，腾讯 DoH 是当前唯一可信通道）——IP 直连腾讯 DoH 端点（1.12.12.12）不依赖被劫持的域名解析，通道存活由发布前预核验（钉扎 npm view 返回真实 latest=3.32.3）先行证明：预核验失败即停，不带病发布。试过放弃的方案：① 改 hosts 文件钉扎——动系统配置，污染面大于进程级注入，放弃；② 用未钉扎 npm view 的结果做核验——劫持环境下数据不可信（本次实测返回污染值 3.32.2），放弃；③ 跳过核验直接发布——违背 3.32.2/3.32.3 惯例（latest 双核验是发布 FR），放弃。

## D-unmapped-381@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-pseudo-domain-clearance
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/sillyspec/modules/_module-map.yaml, .sillyspec/docs/sillyspec/modules/release.md
最近确认：5570285d46e6b499799c7a903903ea11bdd970e0
理由：最大风险：release 模块卡的 doc-debt 机器把任何 package.json 触达（含依赖升级）计为卡欠账 behind——接受：这正是发布面应有的可见性，欠账是 advisory 不阻断。次风险：docs-consistency 承接 10 条语义混杂（报告/收件箱/入库）——接受并留痕：一次性文档工作不值逐条建卡，未来同类工作若复发再立专域。放弃方案：①全部迁 unmapped（伪域计数归零但把 holding pen 灌爆，unmapped 基线消音机制会被打穿）；②为每个 auto-* 补卡转正（伪域即「无模块卡」的病本身，转正等于把噪音域固化进路由词典）；③按 suggestDomainFromFiles 机械迁移（实测对纯文档变更 5/8 组无法判定、2/8 组误建议——正是伪域成因机制本身，不可作为裁决依据）。

## D-unmapped-430@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-known-failures-c-recycle
原编号：D-001@v1
锚点：未记录
文件：test/verify-postcheck-known-failures.test.mjs
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793
理由：最大风险：某测试套件 fixture 输出在真失败场景被行级正则计入失败行——但这只影响失败归因展示（哪些行算「失败行」），不影响 pass/fail 判定（exit 码 + TAP 摘要）；且待审计组条目本身注记「裸子串有吞真风险」，删除方向是收紧。放弃的方案：逐条等待「下次命中再锚定或删」——该约定已挂一个月（9-28 迁移至今），TAP 修复发版多轮无人命中，属拖延而非审慎；坑文原始约定就是修复后整段回收。

## D-unmapped-438@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-stage-templates-retrofit
原编号：D-001@v1
锚点：未记录
最近确认：f5b89b761f7b562048b80f057db96b4d59275c71
理由：最大风险=形式主义（为补流程装样子）——倒推入册的价值仅在审计链补全，若交付本身未验证就是空转。对冲：FR-02 绑定真实测试且收口实测门复核（6/6 绿是协议硬门非自述）。放弃的方案：a) 手工改上一变更归档件（往 change.patch 里补 diff）——归档件是 sha256 锚定的冻结审计面，回写违反不可变原则（D-unmapped-152 同款死路：归档件不回写）；b) revert 后重交付走完整协议——无谓翻搅 git 历史，交付内容零变化纯增风险；c) 不补册（接受缺口留 git log）——缺口已向用户披露、用户指示入册，补册成本一条轻量变更是合理对价。

## D-unmapped-444@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-brainstorm-proto-worktree
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/sillyspec/modules/_module-map.yaml, src/decision-distill.js, src/decision-redomain.js, src/fr-index.js, src/hooks/worktree-guard.js, src/hot-cache.js, src/knowledge-graph.js, src/knowledge-match.js, src/knowledge-quicklog.js, src/knowledge-vector.js, src/redomain-unmapped.js, src/redomain.js, src/run/stage.js, src/stages/knowledge.js, src/worktree.js, test/decision-route-vocab.test.mjs, test/design-knowledge-check.test.mjs, test/fr-index.test.mjs, test/fr-unmapped-repair.test.mjs, test/knowledge-gate-denoise.test.mjs
最近确认：25e267fc5c5063acdbb6eb7ba2b7eeb77970735c
理由：最大风险：豁免面覆盖 verify 阶段——「verify 只审查不改码」的软约束在 worktree 内被放开。判定：可接受。Bash 侧对 worktree 内 cwd 本就无条件放行（echo > 即可写文件），Write/Edit 门与 Bash 门不一致才是现状异常；隔离区内改动不进主树、apply 有 allowlist 门把交付面，风险有双层兜底。 放弃案①：按变更活跃态收窄（仅 DB status='active' 的变更 worktree 放行）——放弃：hook 无法知道当前 agent 属于哪个 change，只能按路径判；且归档残留 worktree 的可写性与 Bash 侧对齐更可预期，引入 DB 活跃态判断反而制造两门不一致窗口。 放弃案②：给 brainstorm 加专用声明（如 proto-worktree flag/mode）——放弃：多一层声明状态要维护，收益只是名义上的「阶段纯度」；位置豁免一条规则覆盖全部非 execute 阶段，且与 Bash 侧策略同构。 放弃案③：只改 STAGE_HINTS 指引不动豁免（纯文档）——放弃：hooked harness 里 agent 被拦后按指引进了 worktree 仍被 :808 阶段门拦死，指引成死路，问题没解。

## D-unmapped-445@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-flow-skill-askuser
原编号：D-001@v1
锚点：未记录
最近确认：b9dfb18de4292ba64e383d6ab8b8d7fdaeb578f2
理由：最大风险：措辞与既有 skill 口径不一致造成双口径——用与 brainstorm 逐句对照验收兜住。放弃方案：① 改 templates/agents-instruction.md（AGENTS.md 生成源）加全局交互规范——放弃：作用域过宽，用户只要求 flow skill 对齐其他 skill 的既有形态，且各 skill 是在 SKILL.md 内自带该节，改全局源反而引入新形态；② 同步改 assets/command-cards/flow.md 命令卡——放弃：命令卡无多选项问询段落，无对齐对象。

## D-unmapped-446@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-review-dispatch-answer-salvage
原编号：D-001@v1
锚点：未记录
文件：src/index.js, src/review-dispatch.js, src/sillyhub-mcp/client.js, test/review-dispatch.test.mjs, test/sillyhub-mcp-platform-fixes.test.mjs
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916
理由：最大风险：**平台 get_worker_result 的 answer 字段形态未拿到 schema 实证**（dsh 会话只证明「平台 UI 可见回答正文」与「artifacts 回收不到」）。缓解：answer/result 双字段兜底 + 任务书 ```json 块指引让原文落在可扫描形态 + salvage 把 artifacts 原文也序列化兜底——三重兜底下最坏退化仍是现状（completed-no-artifact + ②降级），不会更差。 放弃案： - **仅在 --salvage 时写 worker-answer.md**（正常回收不写）——放弃。终态原文是审计证据面（dsh 事故里人工只能靠平台 UI 贴回原文），回收成功也应留原文；且「写了但没提示」无成本（一个 markdown 文件随 .runtime 生命周期回收）。 - **completed-no-artifact 时 CLI 自动降级写 self review**——放弃。降级是人工决策（②里显式确认「平台确无结果」），CLI 自动降级正是本事故要修的「静默把独立评审降成自审」。 - **--from 直接指向 worker-answer.md**——放弃。register-stage-review --from 对文件做 JSON.parse+schema 校验，原文 markdown（含 ```json 围栏与说明文字）必然解析失败；--from 指向「人工修整出的纯 review.json 文件」，worker-answer.md 是修整素材。 - **client.js 里直接做 JSON 提取**——放弃。传输层保持纯度（task-02 既有约束），语义解析归消费方 extractReviewFromArtifacts，本次只透传原文。

## D-unmapped-447@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-lint-to-prepush
原编号：D-001@v1
锚点：未记录
文件：AGENTS.md, templates/agents-instruction.md, test/test-runner-failed-face.test.mjs
最近确认：af6d334b7c0080ccbf67daa13dfa7da1781b11f9
理由：最大风险：收口证据不再含 lint 后，代码变更的 lint 破坏推迟到 push 才暴露（pre-push 拦截），多 agent 并行仓里 push 时 lint 红可能是他侧在途文件、归属判别成本后移——用户已知此代价并显式选 A；缓解：pre-push 钩子同一命令同一口径拦截，不丢防线只换时点。次风险：模板规则 4 措辞随版本发布扩散到消费仓——语义为 additive（描述既有 unavailable 标记），不改默认行为。放弃方案：① B 案面感知 lint（变更面零 lintable 文件才跳过）——放弃：用户显式选 A，且 B 需改 CLI+更多测试面；② 新增 lint_strategy 配置键——放弃：既有 unavailable 标记覆盖诉求，加键徒增配置面；③ 只改 AGENTS.md 不动模板——放弃：test-runner-failed-face ③ 逐字一致断言会红，且模板与 AGENTS 漂移。

## D-unmapped-448@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-cli-manifest-since-cache
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/sillyspec/modules/_module-map.yaml, src/runtime-paths.js, src/spec-sync.js, test/runtime-relayout.test.mjs, test/spec-sync-manifest-cache.test.mjs
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017
理由：最大风险：**缓存与服务器清单脱钩后的幻影行**（缓存含服务器已不存在的行 → 每轮生成 no-op delete op）。诱因仅限缓存文件被外部破坏或服务器纪元更换；防线三层——spec_version 倒退检测全量对账、inc_count 定期全量对账（默认 50 轮）、`SILLYSPEC_SPEC_SYNC_FULL=1` 逃生门；幻影 delete 在服务端本就是无行 no-op（R-07），changes/ 整删另有 computeSpecOps 空树守卫兜底。次风险：缓存文件体积与全量清单同量级（2MB 级）——本地磁盘无压力，读取 <50ms（实测量级），可接受。 放弃的方案：① 只存游标不存 files（每次让服务器返回「游标后全量」）——服务器需新语义（返回基线+增量两段）且无合并锚，协议复杂化；② ETag/If-None-Match 整体未变短路——无变化场景才有效，任何单行变化仍全量 2.2MB；③ 服务器端存客户端会话——有状态、多机 CLI 各自游标互踩，与无状态端点原则冲突。

## D-unmapped-449@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-p0-p1-hardening
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/sillyspec/modules/_module-map.yaml, docs/sillyspec/architecture-4a.md, docs/sillyspec/file-lifecycle.md, docs/sillyspec/platform-interface-map.md, docs/sillyspec/prompt-control-debt.md, docs/sillyspec/review-2026-08-20-full-audit.md, src/config-known-failures.js, src/doctor-diagnostics.js, src/handoff.js, src/index.js, src/machine-interface.js, src/progress/change-registry.js, src/run/bg-sync.js, src/run/complete.js, src/runtime-paths.js, src/spawn-settle.js, src/spec-sync.js, src/watcher.js, src/worktree-apply.js, src/worktree.js
最近确认：4421027e5b776be0f12c38d88517d66275034a9c
理由：最大风险：① 心跳行污染机器可读输出——若走 stdout，`--json` 消费方 JSON.parse(stdout) 会炸；定案走 stderr（console.error），人类/agent 均可见且 stdout envelope 纯净（pwsh 下 stderr 偶发 NativeCommandError 包装是既有环境噪声，心跳仅 >60s 慢路径出现，可接受）。② 冲突标记正则误报（把文档示例当标记）——限定 stash 面文件集 + 行首 `<{7} `/`={7}$`/`>{7} ` 三形态锚定，误报面收敛到「stash 恢复刚触碰的文件自身含行首标记」，即使误报也只是一次可人工解除的 apply 失败，fail-closed 方向安全。③ anon 自动升级被滥用冒充接管——升级仅限「匿名占位（机器级标识）→ 同主机显式身份」，匿名占位本就只拦他机（R-01 明示局限），升级不弱于既有隔离强度；他人显式/跨机持有不受影响。 试过放弃：① libuv 退出断言崩溃根修——Node on Windows 运行时缺陷（async 句柄关闭竞态），应用层无法根除，降级为 spawn-settle bounded 等待缓解（句柄建立完成后再放行父进程退出）；② known_failures 用 js-yaml 整体重序列化——丢注释，用户文档性受损，放弃，改定向行级手术；③ handoff 原子转移所有权到新 SESSION_ID——与既有「SESSION_ID 是所有权标识非会话实例，交接要求保持不变」设计冲突（handoff.js 头注释与 stage-session ledger 契约），且换 ID 本就是偏离交接块指引的操作，定案为粘贴块内显式预告 --takeover 出路；④ `--continue` 幂等化等 P2 项——不在本变更 P0/P1 范围，未纳入。

## D-unmapped-450@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-verify-reuse-large-repo
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/multi-agent-platform/modules/docs.changelog.md, .sillyspec/docs/sillyspec/modules/cli-entry.changelog.md, .sillyspec/docs/sillyspec/modules/core-engine.changelog.md, .sillyspec/docs/sillyspec/modules/machine-interface.changelog.md, .sillyspec/docs/sillyspec/modules/progress.changelog.md, .sillyspec/docs/sillyspec/modules/runtime.changelog.md, .sillyspec/docs/sillyspec/modules/runtime.md, .sillyspec/docs/sillyspec/modules/sync.changelog.md, .sillyspec/docs/sillyspec/modules/worktree.changelog.md, src/machine-interface.js, src/run/code-face-key.js, src/run/complete.js, src/run/gates.js, src/run/verify-quality-scan.js, test/verify-reuse-large-repo.test.mjs
最近确认：3c165eb38e5dcccdb611cdabcd8f8c477d258acc
理由：最大风险：FR-3 的面漂移假阻断——记录实测面 X 后 agent 手动补了测试绑定（面 X+Δ），dedupKey 不含测试面 → 复用可能拦下「其实新面能过」的收口。缓解：30min TTL 收敛窗口 + RERUN=1/force 逃生阀 + 阻断信息给四出路；错拦后果是「多等一轮人工确认」不是假通过（fail-closed 方向）。FR-2 资格先行理论上有「报告刚就绪、亲测本可在本步顺路跑掉却延后」的调度次优——接受（实测本来就该归亲测步，中间步顺路跑正是本次要消灭的浪费）。 试过放弃的方案：① dedupKey 无 git head 时回退「变更文件集内容哈希」——根因查明后不需要（maxBuffer 修复后主路径恢复，兜底代码纯增维护面）；② 收口门复用不带 TTL（与 noAI 闸完全对称）——面漂移风险无界，放弃；③ 把 gate verify CLI 也接快照口径判定——CLI 门本就主仓口径只读跑，接快照是语义扩张，超出本次修复面。

## D-unmapped-451@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-known-failures-unescape
原编号：D-001@v1
锚点：a/.b
最近确认：ea05501b7c2b0060d8542a2933d0209a25bcfe19
理由：最大风险：存量 local.yaml 中已手写「未转义反斜杠」的双引号条目（如手工直编辑出 "a\.b$"——严格 YAML 下 \. 非法，js-yaml 会抛错拒改，本就到不了读侧；宽松形态按未知转义回落字面，\. 不变、\. 回落为 .——语义与修复前对该形态的读法（原样保留 \.）不同。缓解：该形态在 YAML 严格语义下本不合法，js-yaml 门（list/apply 已有）先拦；豁免失配的后果方向是保守（多跑一轮）不是假绿）。次风险：三读侧 import 新模块的加载顺序/循环——叶子模块零 import，无环。 试过放弃的方案：①改写侧不转义（裸写反斜杠）——产出非法 YAML，js-yaml 门必拒，自毁;②读侧整体换 js-yaml 解析该段——三处读侧刻意轻量化不引重链（config-known-failures 注释自述），且整段重解析会动既有「断链容忍/注释容忍」行为面，超本次对称性修复；③只在 verify-postcheck 修——docs-check 与 CLI 侧同病不同修，三口径继续漂移。

## D-unmapped-452@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-docref-checkapproval-reanchor
原编号：D-001@v1
锚点：未记录
文件：docs/sillyspec/platform-interface-map.md
最近确认：5929f3da4ddea89580e4741cca1f8d749230e053
理由：无实质风险（一行字面量；校验器即回归锚）。放弃方案：无。

## D-unmapped-453@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-flow-verify-drafts
原编号：D-001@v1
锚点：未记录
文件：src/flow.js, test/flow-verify-drafts.test.mjs
最近确认：79f8808bb65338c6012af930f10b798f32f9e9ba
理由：最大风险：抽共享源时 approve 行为漂移——对策：approve 输出文案与退出码逐字保持，approve-channel-attest / approve-gate-tick 既有套件零改动全绿作回归锚。放弃方案：①独立实现一份「轻量校验」（两路判定必然漂移，弃）；②把 violations 明细塞进 flow status 恢复简报（status 是自愿查看面，塞校验输出令恢复简报膨胀——与 protocol-tax 输出瘦身方向相反，弃）。

## D-unmapped-454@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-flow-done-preflight
原编号：D-001@v1
锚点：未记录
文件：src/flow-preflight.js, src/flow.js, test/flow-done-preflight.test.mjs, test/flow-protocol.test.mjs
最近确认：32b0e919913c1c6f2a09017400bee7525e860ab6
理由：最大风险：预检与权威门判定漂移（多拦=回归、漏报=白做）。对策：同源同判定（复用同一批函数而非重写）+ 旗标语义逐条镜像（turbo 降 advisory/处置旗标在场不拦/patch 子步已 done 跳过）+ e2e 与 unit 直调锁行为。批准后实现期裁剪：review.json schema 预验不做——三路皆负：①schema 违规成本=修正文件+重跑一轮 RTT，与检测时点无关（同轮提前检测不省轮次）；②违规发生的轮次 ledger 子步已 done（预检位于其内不跑）；③豁免轮（--no-review）权威门不读文件，预检先验会多拦权威门不拦的面（判定漂移）。放弃的方案：①把全部实测后门（绑定槽/空面/模块门）搬进预检——绑定自动补全依赖实测产物、空面/模块门依赖冻结面计算，前移需重实现半个 patch 子步，收益小风险大，本切片只搬独立可算的便宜门，弃；②预检写独立判定逻辑——必然漂移，弃。

## D-unmapped-455@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-dirty-gate-ignore
原编号：D-001@v1
锚点：未记录
文件：src/flow-parity.js, src/flow.js, test/dirty-gate-ignore.test.mjs
最近确认：932698f0db4294d0492efd7610a1f6aac2bb7a2e
理由：最大风险：仓主把真交付路径误配进忽略清单 → 真缺口静默漏审。对策：①前缀是显式仓主声明（与 module_gate_ignore 同治理等级）；②ℹ️ 留痕行每轮可见（配了什么、剔了几个可审计）；③文档口径「已知残渣面」写进键语义。放弃方案：①CLI 自动猜残渣（untracked 整目录/运行库模式启发式）——枚举路径内容违反零枚举红线且必误伤真交付，弃；②按「他侧活跃变更声明」自动放行——经查 collectFreezeFiles 的 split.own 切分已实现该语义（他侧声明的 dirty 本就不进 dirtyWarned），无增量可做，留现状。

## D-unmapped-456@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-turbo-docs-auto
原编号：D-001@v1
锚点：未记录
文件：src/flow.js, src/run/quick-audit.js, test/turbo-docs-auto.test.mjs
最近确认：6df7e3d814ae3a9eab2395d7a61660aaba9f60e8
理由：最大风险：误降档（有代码面被判纯文档→跳过实测与评审）。对策三重：①分类器复用实测门同源常量（实测门「宁可多跑不可漏跑」口径的同一双通道正则——src 段+代码扩展名）；②面含脏面（未提交代码文件也拦降档）且经 dirty_gate_ignore 剔除后判（已知残渣口径与 dirty 门同源）；③判定异常/面空 fail-closed 全量。放弃方案：①docs-auto 档保留评审 1/4 采样（与旗标档差异化）——需把评审豁免从 turbo 单布尔改成分源路由，五个消费点的简单继承就破了，采样校准由豁免面既有 1/4 承担，docs-auto 不叠加机制，弃（如实披露：docs-auto 档与旗标档同形全免）；②按 requirements/design 声明面判纯文档——声明可谎报/滞后，git 面是机械事实，弃。

## D-unmapped-457@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-review-inline-dispatch
原编号：D-001@v1
锚点：未记录
文件：src/flow.js, src/review-dispatch.js, test/review-inline-dispatch.test.mjs
最近确认：07565eb7366003febf78168fba95f31a271bb708
理由：最大风险：①平台结果形态漂移（worker 回传的 review 不合规/提取不到）→ 回退任务书面零损失（validateReviewJson 同一源把关，坏产物进不了登记）；②阻塞等待体感（用户盯着 flow done 不动）→ 等待预算=键值秒数（仓主自定），轮询期每 15s 打一行进度心跳，回退路径永远在场。放弃方案：①缺省开启 inline（阻塞 UX 是仓主决策，且本仓平台可用性因环境而异——配置门控与 dirty_gate_ignore/turbo docs-auto 同形态，弃缺省开）；②复用厚道 dispatch record 异步轮询机制（那是跨命令异步形态，单调用要的是有界同步等待，语义不同，弃）；③reviewer 伪装 subagent（不诚实——如实 'platform-inline'，评审抽查面可区分）。

## D-unmapped-458@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-fr-regress-cap
原编号：D-001@v1
锚点：未记录
文件：src/verify-postcheck.js, test/fr-regress-cap.test.mjs
最近确认：5e828bc224a174502b282b04601663787cebd871
理由：最大风险：被弃的 FR 回归面里恰有本轮变更破坏的用例 → 本地绿、CI 红（回归位移到 CI）。对策：①loud 披露行每轮点名被弃数与去向（不静默）；②帽只作用于保险层，验收层（变更测试∪import 依赖）整跑；③pre-push/CI 门是既有全量兜底（AGENTS 规则 4 既定分工）；④键值仓主可调，脸瘦的变更（fr 面 < N）零弃置零变化。放弃方案：①改缺省为有帽——对所有消费仓是行为变更，升级即变脸，违反零回归底线，弃；②连 import 依赖一起帽——那是「直接受影响面」验收本体，帽它等于自验面失真，弃；③按 FR 新旧/域内排序择优——需引入绑定质量信号（无既有单一源），v1 用现有稳定序，排序优化留数据窗后再定。

## D-unmapped-459@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-fr-regress-default-off
原编号：D-001@v1
锚点：未记录
文件：src/flow.js, src/verify-postcheck.js, test/dynamic-test-inference.test.mjs, test/fr-priority-overlap.test.mjs, test/fr-regress-cap.test.mjs
最近确认：5949a4e473957a99c378b9684da1f0e7d1b8871b
理由：最大风险：升级即变脸——存量消费仓收口实测面突然变小，若某仓的 FR 层实际在抓回归，本地绿 CI 红的次数上升。对策：①缺省跳过恒打披露行+开启指引（每轮可见发生了什么、怎么恢复）；②all 一行恢复旧行为；③release notes 明示 breaking；④CI/pre-push 全量门兜底不变。放弃方案：①保留旧缺省+文档宣传新键（变更 6 已是此形态，用户明确否决——配置摩擦让默认慢路径永存，弃）；②按仓脸肥程度自动缺省（CLI 猜策略违反显式治理，弃）。

## D-unmapped-460@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-config-validate-skill
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js, src/config-validate.js, src/index.js, test/config-validate.test.mjs
最近确认：0622e2e3bb5fdbd7971b514e837d709150b354ab
理由：最大风险：schema 是文档级注册（readers 字符串指向读码点），键定义与真实 reader 行为可能漂移——校验过≠运行时一定读对。对策：①校验声明口径=「schema 注册面」（人类/--json 输出明示）；②段内必填只对 required:true 硬键生效（凭据族，reader 行为简单）；③doctor 的运行时维度（编码完整性等）互补不重叠。放弃方案：①把校验做进每个 reader（69 处散改，爆炸面大，弃）；②自动修复坏键（--fix）——写用户配置文件需谨慎，v1 只报不修，弃；③缺文件报错——违反零配置契约（缺省即全默认形态），弃。

## D-unmapped-461@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-release-3-33-5
原编号：D-001@v1
锚点：未记录
文件：package-lock.json, package.json, test/quick-retired.test.mjs
最近确认：1602451249dcc1fc2b4c637b02862e6cecd320b0
理由：风险=锚漏改致 quick-retired 假红——对策：三处 grep 全量核对+锚套件实跑绿。放弃：不发版直接让消费仓装 git ref（非正式分发通道，弃）。

## D-unmapped-462@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-schema-registration-debt
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js
最近确认：18177dfc5da32ece4be3ae98cbd07311fe001c57
理由：风险=readers 标注不准（旧字段消费点散）——desc 如实标「部分工具仍用」不虚构具体文件。放弃：给 module_paths 做逐叶子键校验（消费点本就模糊，object 整体校验足够，弃）。

## D-unmapped-463@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-py-runner-flags
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js, src/verify-postcheck.js, test/py-runner-flags.test.mjs
最近确认：0b1793eb262d5b61791dc974b238051fb3336c2b
理由：风险=消费仓误配 flags 致 pytest 参数错（如无 xdist 配 -n auto 报错）——显式配置责任在仓主，报错可见可改；放弃：缺省自动加 -n auto（xdist 未必安装，默认加会打挂无 xdist 仓，弃）。

## D-unmapped-464@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-rename-platform-tombstone
原编号：D-001@v1
锚点：未记录
文件：src/deleted-ledger.js, src/progress/change-registry.js, test/rename-ledger-tombstone.test.mjs
最近确认：2921364ddcc22f78cd1d62686adaf0c1c0bbc9ad
理由：- 最大风险：'deleted' 墓碑让平台旧名进入已删判据（`_change_key_deleted` 拒收复活）——日后若想复用旧名会 409。评估：自动建名含 4 字节随机 hex 撞名概率可忽略；「弃名不复活」正是本变更目的（对齐坑9 后平台已删 key 拒收先例）。 - 死路①：平台加 'renamed' 语义/端点——需跨仓（multi-agent-platform backend）改 `_apply_cli_tombstone` 与已删判据，收益仅是变更中心显示「已改名」而非「已删除」，放弃（最小修复、单仓闭环）。 - 死路②：renameChange 内直推平台 rename 载荷——库函数引入网络 IO 破坏分层（现有删除/归档也不直推，走 triggerSync 异步链），放弃。

## D-unmapped-465@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-runner-flags-generic
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js, src/verify-postcheck.js, test/py-runner-flags.test.mjs, test/runner-flags-generic.test.mjs
最近确认：f6259dac59ede489a1f3f04675bdd77478a2f236
理由：风险=消费仓误配 flags 或 deps_regress_cap 过激致本地漏测（CI 红后置）——显式配置责任在仓主，loud 披露每轮可见；放弃：按语言/框架提供专用键（py_flags/go_flags/…）= 开放世界枚举违反规约 00，弃；按框架名匹配注入（vitest/jest/pytest 各写一套）同理弃——统一走 CLI 的批类别。

## D-unmapped-466@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-knowledge-scope-inject
原编号：D-001@v1
锚点：未记录
文件：src/flow.js, src/knowledge-scope.js, test/knowledge-scope-inject.test.mjs
最近确认：e27c3af6f1acf04b7151592483a1f327eff2c2a8
理由：风险=恒注入条目膨胀淹没简报（帽 5 条+溢出计数缓解）；module 域命名与知识域/模块图不一致致永不命中——文档注明用 knowledge 域 id（与 FR 域同源）。放弃：新独立 scope 配置文件（双份真相、迁移成本）；文件级标记（section 粒度更贴合 INDEX 路由）。

## D-unmapped-467@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-knowledge-scope-discoverability
原编号：D-001@v1
锚点：未记录
文件：src/stages/knowledge.js, templates/agents-instruction.md, test/knowledge-scope-cmd.test.mjs
最近确认：e2af70a75bb952c1962feda5dd3957a903073eca
理由：风险=教学文案与解析实现漂移——命令的语法示例由源码常量单源渲染（不手抄）；放弃：仅靠聊天/文档口口相传（正是本次问题），弃。

## D-unmapped-468@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-push-squash
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/sillyspec/modules/_module-map.yaml, AGENTS.md, README.md, SKILL.md, assets/command-cards/push.md, package.json, src/command-cards.js, src/flow.js, src/git-helper.js, src/index.js, src/push.js, src/run/shared.js, templates/agents-instruction.md, test/command-cards.test.mjs, test/flow-guidance.test.mjs, test/git-helper-input.test.mjs, test/push-cli.test.mjs, test/push-plan.test.mjs, test/push-skill.test.mjs
最近确认：f16711d3dedeb6741dc32a08881305b68eb4b60d
理由：- 最大风险：历史重写破坏 SillySpec 的审计锚。缓解=有效 base 抬升 + 备份 ref 保活旧对象 + by-change subject 保留 `(<变更名>)`；`--mode one` 在活跃变更存在时默认拒绝。 - 死路 1：pre-push hook 自动改写。git 在调用 hook 前已捕获要推送的 OID，hook 内改 HEAD 不影响本次推送（临时仓实测：远端收到旧提交）。只做显式命令。 - 死路 2：`git reset --soft` 压扁。会把共享暂存区内容卷进压扁提交；`commit-tree` + `update-ref` 才能保证 index/工作区逐字节不变。 - 死路 3：在活跃 worktree 内压扁。`scanOrphanFace` 只扫 reflog、不认备份 ref，会把旧提交误判为冻结面外；v1 直接拒绝，后续再讨论忽略 pre-squash ref。 - 其他风险：merge commit 展平、签名提交丢签名、tag 指向旧提交、commit-msg hook 被绕过；v1 默认拒绝 merge/已推送区间，签名与 tag 给 warning，pre-push hook 仍正常执行。 - 不做：改写已推送历史、force-push、跨分支批量清理、自动 hook 静默改写、跨仓 push。

## D-unmapped-469@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-push-review-debt
原编号：D-001@v1
锚点：未记录
文件：src/push.js, test/push-cli.test.mjs, test/push-plan.test.mjs
最近确认：05de635886c0f34b498cba3e63255deea4601504
理由：- 最大风险：签名检测依赖 `git log %G?`，在无 GPG 环境对所有提交返回 N——告警天然静默，不会误报（测试锚钉「全无签名零误报」）。 - 死路 1：给签名告警造真实 GPG 签名提交做集成测试——临时仓拉起 GPG 环境在 Windows CI 上脆且慢，放弃；改用纯函数解析锚 + 真仓「零误报」负断言。 - 死路 2：pushBranch 用捕获 pipe 再转发 stderr——hook 输出变成事后整段打印，丢失实时性；inherit 才满足「报错一次给全」，--json 场景保留 pipe。 - 死路 3：编辑已归档的 2026-10-23-push-squash 冻结件来改绑定短语——sha256 锚定件不可改，绑定对齐在本变更 requirements 里以真实测试名重写。

## D-unmapped-470@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-knowledge-tier-denoise
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/SillyHub/scan/CONCERNS.md, .sillyspec/docs/backend/scan/CONCERNS.md, .sillyspec/docs/backend/scan/CONVENTIONS.md, .sillyspec/docs/multi-agent-platform/modules/docs.changelog.md, .sillyspec/docs/multi-agent-platform/scan/CONCERNS.md, .sillyspec/docs/sillyhub-daemon/scan/CONVENTIONS.md, .sillyspec/docs/sillyhub-daemon/scan/INTEGRATIONS.md, .sillyspec/docs/sillyspec/modules/_module-map.yaml, .sillyspec/docs/sillyspec/modules/change-management.md, .sillyspec/docs/sillyspec/modules/cli-entry.changelog.md, .sillyspec/docs/sillyspec/modules/core-engine.changelog.md, .sillyspec/docs/sillyspec/modules/core-engine.md, .sillyspec/docs/sillyspec/modules/dispatch.changelog.md, .sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md, .sillyspec/docs/sillyspec/modules/hooks.changelog.md, .sillyspec/docs/sillyspec/modules/machine-interface.changelog.md, .sillyspec/docs/sillyspec/modules/progress.changelog.md, .sillyspec/docs/sillyspec/modules/runtime.changelog.md, .sillyspec/docs/sillyspec/modules/runtime.md, .sillyspec/docs/sillyspec/modules/setup.changelog.md
最近确认：413f7cf7ed6ed66c97550d272e795b04f92c10b1
理由：最大风险：**清偿误迁**（633 fr + 443 decisions 条的机器推断目标域出错，把决策挪进错误域文件误导后续检索）。缓解：dry-run 报告先行留档人工可核；推断只用封闭判据（文件锚 glob 命中/来源变更覆盖面），命中不了就留——宁漏勿错；迁移幂等且段字节整体搬运（可用反向 redomain 回迁纠错）；冲突键跳过不覆盖。 次风险：**泛词剥离后单关键词域名过匹配**（change/workspace/admin 等常见词域名，上下文出现该词即命中对应域）——接受：域名即路由本义，且只命中单域不再全池；语义兜底由词片回退层承担。**过滤后至清偿完成前的真空**（FR-01 先生效、unmapped 条目暂不可检索）——同变更内 FR-04 紧随执行，窗口以小时计；文件可直查，search 披露行指路。 试过但放弃的方案： - **hits 遥测 demote（neverHit 出池）**——放弃：thin 面遥测断流污染 neverHit 判定（flow.js:338-343 注释自认盲区），且否决条目价值恰在低频救命（deathPath 先例），误杀风险高。另立变更。 - **检索核心不动、仅注入口逐面过滤**——放弃：五个注入口（execute/quick 同步链、flow digest、{DECISION_HITS}、知识门）逐一改，未来新增消费面必漏；单点堵核心三路一处生效。 - **对归档件补写域信息回填路由**——放弃：归档是冻结审计面不回写（D-unmapped-152 死路注记）。 - **graph 缓存用全输入逐文件 stat 指纹**——放弃：12k 文件 stat 走一遍的成本逼近部分场景的全量构建收益；改粗粒度指纹 + TTL + 版本键，陈旧有界且 advisory 面可接受。

## D-unmapped-471@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-flow-done-shared-repo-multi-session-frictions
原编号：D-001@v1
锚点：未记录
文件：docs/sillyspec/platform-interface-map.md, src/run/complete-handlers.js, test/archive-commit-suggest-race.test.mjs
最近确认：ec173b13d125d63acc8ed5b2f71c1ac7e5b43cd6
理由：- 最大风险：误报——HEAD 树已含归档却判未落库，重复提示噪音。缓解：目录首段精确匹配 + `-<name>` 后缀兼容形态入测试锚。 - 死路 1：让 CLI 直接代执行归档提交——共享暂存区多会话下自动 git commit 是历史重灾区（AGENTS 提交纪律），打印 + 升级提示留给确认权在人。 - 死路 2：改用 exit 1 硬拦未落库——幂等重入路径上「已打印待执行」是合法中间态，硬拦会打断断点续；stderr 升级 + 后果说明是披露不是阻断。

## D-unmapped-472@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-push-plan-anchor-batch-perf
原编号：D-001@v1
锚点：未记录
文件：src/push.js, test/push-cli.test.mjs
最近确认：fe962b056b2fff15d37dbd2ae6e2333277a1fa87
理由：- 最大风险：短哈希解析映射错位（批量回显的是完整 sha，输入是短哈希）——按输入序对齐而非按回显内容对齐，测试锚钉短哈希解析成功形态。 - 死路 1：用 `rev-list HEAD` 全集 + 本地 Set 判祖先——sound 性不足（topo 序不判传递闭包）或全集过大，且 is-ancestor 语义（相等=真）需特判，放弃；只批量化「可解析性」，祖先判定维持逐 live 锚 spawn（live 少，成本可忽略）。 - 死路 2：改 git-helper 的 batchCatFileExists 契约——它被归档锚点校验消费（按回显 sha 作键），改键序影响既有消费方；push.js 内做输入序对齐的本地批量，不动公共契约。

## D-unmapped-473@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-24-flow-done-review-artifact-drift-loop
原编号：D-001@v1
锚点：未记录
文件：src/flow-parity.js, src/flow-review.js, src/flow.js, test/flow-protocol.test.mjs, test/flow-review.test.mjs, test/flowdone-disposition-drift.test.mjs, test/thin-empty-face-crosscheck.test.mjs
最近确认：fa9993688f139f22a1403cb1c0acdc80c023d8cf
理由：最大风险：治理文件前缀 `.sillyspec/` 判定把「借治理路径夹带交付内容」的提交误判为保留——缓解：承诺面（requirements/design）单列强拦（touchedPromiseFace → 不成立），且 review.json 等治理件本身不进 patch 冻结面，夹带内容不因保留判定进冻结证据；后果方向是多保留一轮评审对象而非漏拦交付变更。试过放弃的方案：①放宽 reviewAnchoredToHead 为「锚是 HEAD 祖先」——把复审后真正的交付提交也放行，假绿方向不可接受；②按文件 mtime/索引快照判交付面变化——mtime 不可靠（checkout/重排即漂移），快照引入新冻结面与既有 patch 冻结重复；③在评审员侧解决（评审前自查锚后提交）——评审员无收口视野，循环仍在收口侧，治标不治本。

## D-unmapped-474@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-28-knowledge-hits-cli-push
原编号：D-001@v1
锚点：未记录
文件：src/agent-session-log.js, src/knowledge-hits.js, test/knowledge-hits-push.test.mjs
最近确认：630392b1ae1c981f23eb714630d3a2c08496bfb0
理由：最大风险：**逐行直报的请求频次**——高频遥测命令（如 fr-rot-suspect 一命令多条 append）每行一发 HTTP。缓解：注入场景每命令通常数条量级、AbortController 超时上限兜住最坏等待；实测过频再优化（见放弃方案①的攒批形态）。次风险：直报拖住进程退出（活跃 socket 语义）——超时上限兜底 + SILLYSPEC_HITS_PUSH=0 可一键关闭；平台地址配错时每行一次失败 warn 的日志噪音——先例 agent-log 同款形态（warn 一行含状态码），可接受。 试过但放弃的方案： - **命令收尾攒批直报**（收集本次进程新增行一次 POST）：需跨模块传收集器或引入模块级缓冲状态（生命周期面复杂化——缓冲在进程退出时同样有被砍窗口），而逐行直报零状态、行为可局部推理；请求频次问题留实测证据再优化，不为假想性能加状态； - **改各调用方显式上报**（10 个调用点各自接 push）：写入口唯一性是现成资产，改 10 处徒增漂移面； - **CLI 侧维护已上行 offset**（复刻 daemon 增量机制）：双通道各自记 offset 必然漂移，行级幂等使客户端零状态成为更简正确解。

## D-unmapped-475@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-26-target-files-main-docs-rescue
原编号：D-001@v1
锚点：未记录
文件：package.json, src/verify-postcheck.js, test/target-files-main-docs-rescue.test.mjs
最近确认：bc750ba451daf06cf23833db7f39ce6cdf74783a
理由：最大风险：救赎把「主仓恰好改过同名治理文件但本变更没写」的声明误判为 matched——缓解：救赎只对显式声面生效且限治理前缀，误判后果是对账少一条 missing（保守方向是少拦不是假绿），且 notes 披露救赎计数可审计。试过但放弃的方案：①扩 worktree actual 读主仓全量 status——把主仓侧无关改动也卷进对账面，undeclared 假红换一种方式回来；②铁律改成都写 worktree 再同步主仓——「产物蒸发」风险方向（worktree 清理即丢档）不可接受；③对账时把治理路径从声明面剔除（不查）——自废对账语义，真缺产物从此无人拦。

## D-unmapped-476@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-28-stages-cycle-root-fix
原编号：D-001@v1
锚点：未记录
文件：src/run/shared.js, test/stages-cycle-regression.test.mjs
最近确认：3995056145c880fe9bf3fb41ce47ab7a9ef45fd7
理由：最大风险是环不只这一条（同一子树可能还有其他模块静态引 stages/index.js 系），断此边后换入口形态仍撞——对策：诊断脚本全子树扫描确认 run/shared.js 是唯一回边（常量/进度等直引者不在 execute.js 子树内），并加 FR-02 静态断言锁死该文件的 import 面防复潮。次级风险：动态 import 首调有微小延迟（<1ms，模块已缓存路径无感）——getStageSteps 非热路径，可忽略。 放弃的方案：① 改 stages/index.js 把 stageRegistry 惰性化（getter/工厂）——所有消费方 API 面翻动，风险远大于收益；② 断 execute.js → knowledge-hits 边——那是知识遥测的正当依赖方向，反向把 appendKnowledgeHit 惰性化属错位修补（环的成因在 run/shared 这个共享库背了重依赖，不在知识链）；③ 把 stageRegistry 挪到轻叶子模块——注册表定义与阶段定义文件强耦合，搬家动 10+ 文件。

## D-unmapped-477@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-28-cp-review-debt
原编号：D-001@v1
锚点：未记录
文件：src/checkpoint.js, src/index.js, test/shadow-checkpoint.test.mjs
最近确认：9407cb2f2dc203940baa51efe8854c3d3cdf984c
理由：最大风险是 `:(glob)**/<dir>` pathspec 语义与预期偏差（不同 git 版本对 glob 魔法的 `**` 行为）——对策：测试直接断言嵌套路径不进快照树（行为锚而非语法锚），实测 git 版本（本机）通过；若某些老 git 不支持 glob 魔法，reset 会报错走 fail-open skip（存档退化但 tick 不受影响），属安全方向。 放弃的方案：① 把 .env* 也改成任意深度——敏感文件按项目根级约定，深层同名文件多为模板/示例（.env.example），全局排除过宽；② restore 校验改 merge-base --is-ancestor——祖先判定过宽（主历史全部提交都是链祖先，非 checkpoint 的普通提交会被放行读档）；③ 显示面也去帽——超长链列屏无信息量，帽是展示层的合理取舍（评审债的本质是校验被显示帽绑架，不是帽本身）。

## D-unmapped-478@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-28-overlap-route
原编号：D-001@v1
锚点：未记录
文件：.sillyspec/docs/sillyspec/modules/_module-map.yaml, src/flow.js, src/foreign-declared.js, src/index.js, src/overlap-detect.js, test/overlap-detect.test.mjs
最近确认：a1b8e36852f585eaaab7496b55133c38f448623b
理由：最大风险是声明源噪声：未归档旧变更的陈旧 design 声明会喂活假重叠（既有坑 baseline-overlay-cross-change-contamination 同源现象）——advisory 定位容忍（提示而非阻断），文案里给「确认对方变更已死可归档后消音」出口；若实测噪声大，后续可加活跃度过滤（DB last_active 阈值），本版不做（先看真实使用密度）。 放弃的方案：① 重叠检测做成批准门硬阻断——把「路由建议」升格为「禁行」，违反「不是禁止是分流」的设计意图，且陈旧声明会制造假禁行；② 用 collectForeignDeclaredFiles 逐变更查他侧声明——N 次全量扫描 + own-priority 语义（双方声明归 own）恰好把重叠面藏掉，方向相反；③ 落地序列新做调度器——既有 main-repo.lock + apply --3way + guard 预检已覆盖序列与合并，重做是重复建设，本变更只在指引文案里把既有机器串成协议叙事。

## D-unmapped-479@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-29-open-metrics-gate
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js, src/flow-review.js, src/run/gate-snapshot.js, src/run/quick-audit.js, src/run/verify-quality-scan.js, src/verify-postcheck.js, templates/agents-instruction.md, test/config-schema.test.mjs, test/flow-review.test.mjs, test/quick-metrics-gate.test.mjs
最近确认：e7c4ec047a8df79b8fc0002a9eed41fc32917f5c
理由：最大风险：存量仓首配即红——指标工具对全仓历史代码报红，配置者第一次启用就被拦，治理成本突袭。缓解：desc 写明「通过标准由命令自身定义——建议命令只扫变更面/自带阈值」，且不配置零影响；这是声明的采用边界（用户渐进采用，CLI 不替人清存量债）。 放弃的方案：① 绑定 crapper/dryer/mutator 内置集成——违背工具中立纪律且引入新依赖，改开放命令门；② metrics 做 lint 同款 ownership triage（存量债降级 advisory）——依赖「失败输出含文件路径」提取前提，指标工具输出形态千差万别（分数表/JSON/正文），归属鉴定不可靠，误判比不判更糟，范围控制责任交给用户命令；③ 复用 commands.lint 塞复合命令（`lint && crap-check`）——超时语义混用、证据面不分 kind 无法对账、存量 lint 配置被动改变行为；④ metrics 失败 advisory 不阻断（学 lint 观察期先例）——lint 当年观察期是因外部数据未足，而 metrics 的非零退出语义由用户命令自定义（用户写 `crap-check --fail-over 10 src` 就是他的标准），首版即硬门才配得上「确定性质量门」的采纳初衷，且 fail-open 缺省已保证不配置零影响。 已知取舍：超时=failed 对慢工具会假红——desc 明示慢工具提帽（metrics_timeout_sec）或放 pre-push/CI 层，不在每变更收口跑。

## D-unmapped-480@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-29-metrics-routes
原编号：D-001@v1
锚点：未记录
文件：src/config-schema.js, src/run/quick-audit.js, src/run/verify-quality-scan.js, src/verify-postcheck.js, templates/agents-instruction.md, test/config-schema.test.mjs, test/quick-metrics-gate.test.mjs
最近确认：b2b4c12798b5119d9937ab055fc49c939f267f35
理由：最大风险：**前缀误蹭/漏配**——路径段边界匹配写错会让 frontend/ 误吃 frontend-v2/ 的变更（假门红）或深路径漏命中（假跳过）。缓解：匹配算法钉死段全等语义（`file === p || file.startsWith(p.endsWith('/') ? p : p + '/')`），正反两向专测（误蹭负例 + 深路径命中正例）；解析器缩进语义随 modules 块坑史（任意非零缩进，不硬编码空格数）。 放弃的方案：① glob/通配路径——前缀集合已覆盖 monorepo 目录形态（modules 先例同口径），glob 引入 Windows 通配语义与转义复杂度，收益不成比例；② gate 并行执行——秒级 gate 串行总时长可控，并行放大资源峰值且输出交错难归因；③ 按语言扩展名自动路由（.ts→eslint、.java→PMD）——枚举开放世界违反规约 00（新语言要改 CLI），路径集合是仓主声明的中性事实；④ 路由复用 modules 块（modules.<name>.metrics 键）——modules 块语义是测试子集映射，混入指标门职责耦合两个机制的生命周期，独立段更清晰。 已知取舍：gate 命中子集注入 SILLYSPEC_CHANGE_FILES 是**该 gate 的命中文件**（非全变更面）——gate 内工具天然只看自己的域；需要全量的命令仍走单命令形态（共存）。

## D-unmapped-481@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-knowledge-scope-recall
原编号：D-001@v1
锚点：未记录
文件：eval/knowledge/baseline.json, eval/knowledge/datasets/organic.jsonl, eval/knowledge/fixtures/index.mjs, eval/knowledge/lib/dataset.mjs, eval/knowledge/lib/faces.mjs, eval/knowledge/lib/report.mjs, eval/knowledge/run.mjs, src/knowledge-graph.js, src/knowledge-match.js, src/stages/knowledge.js, test/eval-knowledge-dataset.test.mjs, test/eval-knowledge-runner.test.mjs
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef
理由：**风险**：① section 切分对无 `##` 标题的文档（整篇一个 section）退化为全文档粒度——仅对该形态文档生效，且 INDEX 条目通常有锚点，可接受；② 两跳的 rejected 中部分位于停车场文件——两跳只按状态过滤不看文件，停车场条目仍可能从两跳进来（它们是真实历史否决，保留有价值，且展示面已有变更名限定）；③ 本仓真实语料 doc-refs 命中面小（实测仅 1 条本地路径）——探针与新增 case 主要靠 fixture 与跨仓路径，验收口径已按子集单列。 **放弃的方案**：① 全文档粒度 doc-refs——实测 1356 条边、单路径最多 65 条目，entry cap 3 变抽签；② doc-refs 改 strong——破坏 graphPath 契约（已有强边不可达测试）并污染 impact 闭包；③ 两跳全量 decisions + FR——144 决策/644 FR 无可用消费面，recency 排序前 11 全是模板底稿；④ 纯 recency 替代 rejected 先验——热文件实测退化；⑤ 引擎 cap 20→5——与 FR-03 的 3/20 契约和 raw/rendered 归因冲突（5 是渲染端 cap）；⑥ organic 到每仓 50 并入本变更——样本组成变化会与代码效果混淆，推迟独立数据变更。

## D-unmapped-482@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-knowledge-fusion
原编号：D-001@v1
锚点：src/flow.js
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f
理由：**风险**：① 热文件 scope 否决（本仓 src/flow.js 实测 15 条 rejected/deathPath，多为模板底稿）在 flow 反复出现——用独立小节 + ≤3 + 触达文件来源标注压噪，且不挤占路由 top-5；② 每消费面 45ms 图读取成本——路由命中才构建 + 进程级 memo（按 specRoot 缓存）；③ task 卡键形态杂（glob/目录）——graphPathCandidates 统一过滤，宁空不造。 **放弃的方案**：① 合并进 decisionHits 后统一 score 排序——跨通道尺度不可比（路由 Jaccard 0~1 vs scope 2/1），会让 scope 直连压掉查询相关条目；② 合并 entries 后 cap 3——路由 raw 被截断会回归 eval 与既有契约（cap 留渲染层）；③ buildKnowledgeInjection 改 async——连锁破既有同步测试与 Wave 孪生；④ cmdSearch --scope / {DECISION_HITS} 传 scope——无机器键，编造键违反 D-004；⑤ 路由命中后跑向量——破坏零网络约束与既有测试；⑥ 条件式「仅路由无 rejected 时跑 scope」——会漏「路由有 rejected 但热文件另有否决」形态且使 s-scope-03 类两跳期望消失。

## D-unmapped-483@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-knowledge-engine-tail
原编号：D-001@v1
锚点：未记录
文件：eval/knowledge/README.md, eval/knowledge/baseline.json, src/flow.js, src/knowledge-graph.js, src/knowledge-stats.js, src/knowledge-vector.js, src/run/prompt.js, src/stages/execute.js, test/knowledge-fusion.test.mjs, test/knowledge-graph.test.mjs
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a
理由：**风险**：① 向量路径融合新增冷缓存图构建（~7.1s 首次）——接受项，写明；② 遥测口径变化影响 knowledge-stats 历史解读——文档同步 + neverHit 语义不变（仍按查询通道）；③ section doc-refs 过滤减少边数（预期降幅写入设计），scope 对手工条目的召回面收窄——只影响裸名词引用，可接受。 **放弃的方案**：① 遥测把 scope 全部并入 matchedFiles——20 条 scope 决策会让 neverHit 失真（每次 flow start 反复计命中）；② 统一 standalone 到 getKnowledgeGraph——同进程陈旧图有实测（先 get 后改知识再 get 仍返回旧图），收益仅省 45ms；③ doc-refs 过滤用「盘上存在」——图会依赖构建时文件系统状态、缓存指纹不覆盖目标存在性；④ frCount 改注释保留——死字段继续误导，直接删除。

## D-unmapped-484@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-knowledge-provenance
原编号：D-001@v1
锚点：未记录
最近确认：3f2421bd96c16584248c661b27e790c3ee948f5b
理由：**风险**：① 模板特征词启发式可能漏判/误判——报告逐条列出 title/reason 供人工核，计数与审查实测对照暴露差异；② 平台仓路径不可用时只出本仓报告（如实披露）。 **放弃的方案**：① 直接跑 redomain 归域（审查实测：可迁全模板、真实决策 0 条可迁）；② 用 suggestDomainFromFiles 批量归域（37/39 与模块投票不一致、产出 src 伪域）；③ 在本变更里改知识文件（4A 定位只读对账，写入属 4B/4C）。

## D-unmapped-485@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-knowledge-redomain-map
原编号：D-001@v1
锚点：未记录
文件：src/redomain-unmapped.js, test/redomain-unmapped-map.test.mjs
最近确认：715a73f5f68dae3951de710f0dd8e81e9f0b4f83
理由：**风险**：① 裁剪是破坏性写——精确计数断言 + fail-fast + 幂等 + git 回滚四层防御；② id 漂移——执行时重判定、未知 id 断言拦截；③ 平票语义错误传染平台清单——清单侧检测平票输出候选集不硬选。 **放弃的方案**：① 不裁剪只归档（搬第二个停车场）——新增维护面且 unmapped 已被检索过滤，收益为零；② 正文 hash 硬阻断——段头/原编号/最近确认天然不同会错杀（226/229 逐字节一致、2 条仅锚点拼写差异，警告披露即可）；③ 9 unique 在本仓打 provenance 标——解析契约无此字段，标记设计并入 4C；④ --map 保留逐组容错——显式契约应 fail-fast。

## D-unmapped-486@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-knowledge-status-lines
原编号：D-001@v1
锚点：未记录
最近确认：6c523fa826089a414853e8e4d5fe1d4deae08d5a
理由：**风险**：状态误判——无检索后果（isResolvedRoute 不读正文），建议清单人工复核兜底。 **放弃的方案**：① decisions/unmapped 加「状态：draft」字段行——docs-check 机械解析契约+producer 幂等性风险（审查实证），改头注自描述；② 改 isResolvedRoute 读正文状态行——数据迁移不夹带检索行为变化（变更 4 审查裁决），留独立变更。

## D-unmapped-487@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-quicklog-inject-retire
原编号：D-001@v1
锚点：未记录
文件：src/knowledge-quicklog.js, src/run/prompt.js, src/stages/execute.js, test/knowledge-inject.test.mjs, test/knowledge-quicklog.test.mjs
最近确认：13825bae60785cf4182923729092174238437d59
理由：**风险**：摘除后注入测试对 quicklog 段的断言（若有）需同步摘除——grep 确认。 **放弃的方案**：全删 quicklog 子系统（quicklog.js + 目录 + test-bindings）——test-binding 强边消失影响图谱、11+ 测试文件连锁、且 QUICKLOG 记录是独立子系统非检索面，需用户另行决策。

## D-unmapped-488@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-11-02-constraint-mechanize
原编号：D-001@v1
锚点：未记录
文件：AGENTS.md, src/flow.js, src/run/complete.js
最近确认：64a8bd0386f5d814f6447623b4f1c37a19f6bbbe
理由：**风险**：注入行变长占 token——反例限一行。 **放弃的方案**：① 把规约 00 升维为多层约束力模型文档——理论正确但不产生生成时刻约束，反例才是可 grep 的；② 强制「落地层：」字段——解析契约新增字段有风险（D-002 先例是可选非强制），提示面即可。

## D-unmapped-489@v1 方案范围=正文词片兜底 + 弱命中并联本地词片
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-001@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：用户于 brainstorm Step 3 收尾一轮明确选择「方案1+2 组合」：①正文词片兜底通道（词片回退语料从 decisions 域扩到全部 INDEX 引用知识文件的 ## 段落正文，锚点级命中，复用 queryShingles+复现窗+已修复过滤同口径）；②弱命中不彻底短路——路由命中时仍并联本地词片层做去重合并，不并联向量（保「路由命中零网络」性能契约）。
故障面：弱命中场景多跑一遍正文扫描的耗时（语料 ~10 文件分段，量级几十 ms）；词片命中噪声进入注入面（需 cap 与排序约束）
退役判据：平台向量层语料扩展到全库知识文件且离线仓有可用语义通道时，本地词片兜底可降级为零命中-only

## D-unmapped-490@v1 窗参数设计期按泛在度统计数据定
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-002@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：我的判断：不预设——Step 5/6 设计时先对实证语料做只读泛在度统计（各知识文件 ## 段落中典型查询 bigram 的分布），按数据定窗；门槛参数（≥4 是否降 ≥3 救 cwd 类短词）不在本次范围（用户裁掉），设计期仅记录数据供后续变更。

## D-unmapped-491@v1 非目标裁剪——向量语料扩展与入库侧词表派生不做
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-003@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：我的判断：均不做。向量语料扩全库属跨系统改动（平台端点契约 + 索引重建，knowledge-vector.js:15-20 端点契约只收决策条目）且离线仓不受益，双路一致判为长期方向；入库侧词表自动派生被 D-unmapped-197（2026-09-29-decision-route-vocab）否决——同窗词片按序截断=抽签，本次方案全走查询侧无复潮冲突。

## D-unmapped-492@v1 实现方案=B 新增独立正文兜底函数
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-004@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：用户于 brainstorm Step 4 选择「B 新增独立函数」：fallbackByQueryShingles 原样保留（decisions 专用零改动）；新增 fallbackByBodyShingles 承接 INDEX 引用的普通知识文件 ## 段落正文语料（复用已导出的 queryShingles 与窗判定）；matchKnowledgeHybrid 编排两处接线——路由命中后并联 body 兜底去重合并（不并联向量，保零网络契约）、零命中链在 decisions 回退后补跑 body 兜底。
故障面：两兜底函数并存的一致性维护（窗参数若日后分叉需同步）；并联分支去重逻辑错误可能重复注入同条目
退役判据：若后续统一为单一兜底通道（A 形态复潮且成立），本函数可并入

## D-unmapped-493@v1 落选——A 扩展现有回退函数为统一通道
状态：rejected
变更：2026-11-06-knowledge-body-recall
原编号：D-005@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：落选。
否决理由：fallbackByQueryShingles 是 2026-09-29-decision-route-vocab 刚落地机制且被 search/digest/门条目行三面消费——语料参数化使其职责膨胀，decisions 的 decisionHits 结构与普通段落锚点 entries 混合，回归波及既有 decisions 通道行为（用户裁定弃）。
复潮条件：decisions 通道消费面收敛为单一形态（decisionHits 与 entries 结构统一），或函数重构后三面消费有独立回归测试覆盖时。

## D-unmapped-494@v1 落选——C 预建正文词片索引（物化）
状态：rejected
变更：2026-11-06-knowledge-body-recall
原编号：D-006@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：落选。
否决理由：引入索引同步/失效管理（知识文件改动→索引漂移，属本仓「双写必漂移」坑家族新成员）+ 新运行时产物与生命周期；而实时扫描语料仅 ~10 文件几十 ms，性能前提不成立——纯增复杂度零收益（用户裁定弃）。
复潮条件：知识库规模增长到实时扫描进入秒级（如百级文件）且检索频次高到成为热路径时。
