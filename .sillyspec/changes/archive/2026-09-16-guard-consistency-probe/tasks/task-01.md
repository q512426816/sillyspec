---
id: task-01
title: 'Probe9 guard-consistency core in verify-probes.js (three exports + render section + facts metrics)'
title_zh: '探针9 核心实现——verify-probes.js 三导出（clusterMutationMethods/detectGuardSignals/runProbe9GuardConsistency）+ 渲染段 + metrics'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 20:16:18
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
target_files:
  - src/verify-probes.js
provides:
  - clusterMutationMethods(sourceText) → Array<{entity, methods: Array<{name, startLine, endLine, body}>}>（同实体 ≥2 变更方法才成组；design 接口定义）
  - detectGuardSignals(methodBody, signatureContext) → string[]（命中信号类别列表；空=无守卫）
  - runProbe9GuardConsistency({ specBase, cwd, wtRoot, changeName }) → { applicable, javaFileCount, groupCount, inconsistentGroups: Array<{entity, guarded, unguarded, signals}>, notes }
goal: >
  verify 探针族新增「探针9 守卫一致性」advisory——design 清单 .java 文件内同实体变更方法组
  有守卫与无守卫并存时产出 WARNING（含方法名与守卫信号证据），填补探针5（URL 级）/探针8（字段
  契约）之外的权限守卫面机器覆盖真空（EHS doSubmit 越权 P1 同族）。
implementation:
  - 探针9 常量与纯函数区——src/verify-probes.js 探针8 纯函数区之后（:137-190，PROBE8_HEADING 同款风格 :142）新增 PROBE9_HEADING（「#### 探针 9：守卫一致性（advisory）」，与既有探针段风格一致）与变更动词前缀集（submit|delete|remove|withdraw|update|handle|confirm|reject|audit|save|cancel|approve）
  - 导出 clusterMutationMethods(sourceText)——签名正则 (public|private|protected)\s+[\w<>\[\],. ]+\s+(\w+)\s*\( 提取方法（体=签名行到下一签名/类结尾），方法名剥前缀动词取尾段实体名词（驼峰切词、大小写归一，doSubmit/submitOrder→Order）；同文件同实体 ≥2 方法才成组，单方法不成组（design §1 / R-01 宁漏勿误）
  - 导出 detectGuardSignals(methodBody, signatureContext)——方法体先做等长注释掩码（复用 src/endpoint-extractor.js stripCommentsKeepLength :37 思路，探针内自实现防跨模块耦合）；四类信号——当前用户比对（getCurrent|currentUser|getUserId|getLoginUser|ShiroUtil|SecurityContext|ThreadLocal 调用形态，或与 createBy|create_by|openBy|userId 的 .equals( / == 比较）、角色判定（hasRole|isCompany|manager|Admin|Role 的 if 条件形态或 manager|isAdmin 布尔参数）、能力类调用（canHandle|checkPerm|assert[A-Z]\w*(Perm|Auth|Owner|User)|validate.*User 的 xxx( 调用形态）、注解式（签名前 3 行 @PreAuthorize|@RolesAllowed|@SaCheckPermission|@RequiresPermissions）；纯标识符弱信号不计（design §2 / R-02）
  - 导出 runProbe9GuardConsistency({ specBase, cwd, wtRoot, changeName })——design 清单解析与双根读取对齐 runProbe8PayloadParity（:302 起；readEntry 主仓∪worktree 双根回退 :319-338）：只扫清单 .java 文件（其他扩展名计数注记 skipped；.java 首行 // probe9-skip 整文件跳过），逐文件聚类+信号比对——组内有守卫×无守卫并存 → inconsistentGroups（{entity, guarded, unguarded, signals}）；无 .java → applicable=false+不适用注记（design §3）
  - runVerifyProbes 接线（:735 函数体尾）——探针8 fail-soft 包装同款（:949-956）try/catch 兜底 probe9 异常降级 not-applicable 注记不炸整体；返回对象（:958）追加 probe9 键（旧调用方/合成 result 无该键时渲染层兜底，探针7 零回归口径同款 :1004-1007）
  - 渲染段——renderVerifyProbesReport（:964-1063）在 probe8 段接线（:1061-1062）后追加 renderProbe9Lines（renderProbe8Lines :1073-1105 同构）：不适用行（:1076 同款）、advisory 口径注记（存在性检查非语义审计；聚类启发式误报由 agent 裁定，:1080 同款）、逐组 ⚠️ 行（实体+guarded/unguarded 方法名+命中信号证据）；不适用时注记不空段
  - facts metrics——buildVerifyFacts（:1115-1179）probes 追加 probe9 键（probe8 段 :1164-1176 同构）：metrics 三键 javaFileCount/groupCount/inconsistentGroups（defined() 取不到宁可少列口径 :1118）
acceptance:
  - FR-01 聚类——同实体 ≥2 变更方法成组输出（方法名+行区间+体）；单方法不成组不计 groupCount
  - FR-02 信号——四类任一命中判有守卫；纯标识符出现（变量名恰含 manager 等）不计；注释掩码后字符串/文档示例不误报
  - FR-03 告警——组内守卫/无守卫并存 → inconsistentGroups 含 {entity, guarded, unguarded, signals}，渲染为 advisory ⚠️ 行（不阻断）
  - FR-04 边界——清单无 .java → 不适用注记；.java 首行 // probe9-skip 整文件跳过；单文件解析异常 fail-soft 跳过不炸整体
  - FR-05 渲染与 metrics——渲染含「#### 探针 9」段与口径注记（不适用时注记不空段）；verify-facts.json probes.probe9.metrics 含 javaFileCount/groupCount/inconsistentGroups 三键
verify:
  - node --test test/probe9-guard-consistency.test.mjs
  - npm test
  - npm run lint
constraints:
  - 探针 1-8 语义零变动——只新增探针9 代码路径，不改既有导出面/既有渲染段行文/facts 既有键
  - advisory 不升硬门——⚠️ WARNING 不阻断（gates.js 不在本卡 scope）
  - 宁漏勿误——纯标识符弱信号不计入；只扫 design 清单 .java 文件（非全仓单遍正则，R-04）
  - 跨平台兼容 Windows/Linux/macOS——路径 join、CRLF/LF 归一（探针1-8 同款口径）
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
