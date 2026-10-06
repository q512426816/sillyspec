---
author: flow-machine-draft
created_at: 2026-10-06T13:38:06.171Z
---
# 需求规格（Requirements）— 2026-10-06-verify-friction-fix

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: verify-probes --init --force 覆盖前自动落带时间戳备份到 .sillyspec/.runtime/verify-runs/ 并打印备份路径；新增 --refresh-probes 定向刷新：只刷新未手填的探针预填段，已手填段保留并逐段报告跳过原因

`verify-probes --init --force` 必须在覆盖写骨架前把现 verify-result.md 复制到 `<runtimeRoot>/verify-runs/verify-result-backup-<毫秒时间戳>.md` 并在输出打印备份路径；`--refresh-probes` 必须只替换仍含 `<待填`/`<!--TODO` 占位的探针机械段（段内已填表格行按首列键携载到新渲染），已手填段原样保留并在汇总行逐类报告（替换/保留/新注入/携载行数）；禁止 `--refresh-probes` 与 `--force` 并存执行（语义矛盾，exit 2）。

#### 场景：手填结论在刷新后存活

Given verify-result.md 已手填结论枚举与探针 7 部分矩阵格 / When `verify-probes --change <名> --refresh-probes` / Then 结论槽行与已填矩阵行逐字保留，仅含占位的机械段被替换，且刷新前存在自动备份文件。

#### 场景：force 重置可找回

Given verify-result.md 含手填内容 / When `verify-probes --change <名> --init --force` / Then 手填内容被重置但备份文件内容与覆盖前原文逐字一致。

### FR-02: sillyspec gate last --change <名> 直接打印 gate-last 指针内容与 blocked 明细（含 reconcile missing/undeclared 摘要），exit code 反映是否存在阻断；sillyspec runtime list 的 KNOWN 清单登记 verify-runs

`sillyspec gate last --change <名>` 必须直读 `.runtime/verify-runs/gate-last-<change>.json` 稳定锚点并打印 blocked 状态、note、取证目录及其内 reconcile-result.json 的 missing/undeclared 摘要与 probe-consistency-result.json 的 mismatches（不重跑任何检查）；无记录或未阻断时 exit 0，blocked 时 exit 1；`runtime list` 的 KNOWN 清单必须登记 verify-runs 条目（含 gate last 用法提示）。

#### 场景：无锚点

Given 该变更从未发生 verify --done 阻断落锚 / When `gate last --change <名>` / Then 打印「无 gate-last 记录」与指针路径，exit 0。

#### 场景：blocked 锚点直读

Given gate-last 指针 blocked=true 且指向的取证目录含 reconcile-result.json（missing 1 条）/ When `gate last --change <名>` / Then 输出含 blocked=true、该 missing 条目明细，exit 1。

### FR-03: plan postcheck YAML 硬门报错按 js-yaml 错误类型分诊：至少覆盖半角冒号（mapping values are not allowed）、保留指示符（cannot start any token，含反引号）、流序列（expected , or ]）三类，各给中文修复动作；新增 sillyspec taskcard validate [--all|--task task-NN] 独立校验命令（frontmatter/必要字段/占位符/target_files 形态），失败 exit 1

plan postcheck 的 frontmatter 非法 YAML 报错必须内联「分诊：」前缀的中文修复动作，分诊按「出错行内容 + js-yaml 消息家族」双信号至少覆盖冒号+空格值、保留指示符开头（反引号/@/%）、引号不成对、流序列/花括号四类（js-yaml v4 真实消息与文档措辞有漂移，禁止只匹配消息文本）；`sillyspec taskcard <change> --validate` 必须用 plan 门禁同源规则（frontmatter 合法性、必要字段、占位符、target_files 严格形态）校验全部任务卡，存在 error 时 exit 1。

#### 场景：冒号值卡的分诊

Given 任务卡 frontmatter 含 `title: A: B` 形态（js-yaml 报 bad indentation of a mapping entry）/ When 校验 / When plan postcheck / Then 报错含「分诊：」且动作提到冒号+空格处置法。

#### 场景：validate 拦严格形态

Given 任务卡 target_files 含 `src/*.js` glob 条目 / When `taskcard <change> --validate` / Then 报 target_files 形态非法（通配符）且 exit 1。

### FR-04: API_FACE_DECLARED_RE 宽收同义声明（无接口变更/不涉及接口/零端点/无端点/0 端点），design 骨架接口段 TODO 注释附可直接粘贴的声明句式；宽收有回归测试钉住

parseDesignApiTable 必须把同义零端点声明（无接口变更/不涉及接口/零端点/无端点/0 端点）认作 declared=0；数字式声明必须优先于同义式（含 `(?<!\d)` 防护，禁止「10 端点」的尾 0 误命中零式）；声明匹配面必须剥 HTML 注释（design 骨架指引句式留在注释内不得自动生效）；design 骨架接口段 TODO 必须附含「本变更接口面：0 端点」的可粘贴句式且置于注释内。

#### 场景：散文零端点声明入矩阵

Given design.md 接口段写「本变更不涉及接口」/ When parseDesignApiTable / Then declared=0（API 矩阵按 agent 声明渲染零面行，而非不识别）。

#### 场景：骨架句式不自动生效

Given design.md 由新版骨架生成、声明句式仍在 HTML 注释内未被粘贴为正文 / When parseDesignApiTable / Then declared=null（不自动声明零端点）。

### FR-05: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

新增的三个测试文件（test/verify-probes-refresh-backup.test.mjs、test/taskcard-yaml-triage-validate.test.mjs、test/gate-last-reader.test.mjs）必须收录进 package.json 的 test:core 清单；收口时 test:core 必须全绿（276+ 用例 0 失败）且 npm run lint 必须 0 报错。

#### 场景：主路径

Given 本变更全部实现合入 / When `npm run test:core` 与 `npm run lint` / Then 两者均 0 失败退出（E2E 冒烟另证：手填结论经 --refresh-probes 存活、--force 前自动备份、gate last 三态输出）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/verify-probes-refresh-backup.test.mjs「backupVerifyResult：落时间戳备份，原文不动，路径在 verify-runs 下」「refreshProbeSections：含待填占位的段被刷新，已手填段保留，表格已填行携载」
FR-02: test/gate-last-reader.test.mjs「blocked 指针 + 取证目录 → 摘要含 reconcile missing/undeclared 与 probe mismatches」「无指针 → found:false（不抛）」
FR-03: test/taskcard-yaml-triage-validate.test.mjs「diagnoseTaskYamlError：冒号值 / 反引号指示符 / 引号不成对 / 流序列四类分诊」「validateTaskcardsCli：好卡过、target_files 非法形态拦、占位骨架拦」「validatePlanFeasibility：非法 YAML 报错含分诊动作」
FR-04: test/verify-probes-refresh-backup.test.mjs「parseDesignApiTable 声明宽收：同义零端点 → declared=0；数字优先；注释内不认」「design 骨架接口段 TODO 附可粘贴声明句式（注释形态不自动生效）」
FR-05: test/verify-probes-refresh-backup.test.mjs「backupVerifyResult：目标缺失时返回 null 不抛（fail-soft）」（连同全量 test:core 276 用例 0 失败 + lint 0 报错，见变更提交链）
