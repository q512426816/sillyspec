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

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: sillyspec gate last --change <名> 直接打印 gate-last 指针内容与 blocked 明细（含 reconcile missing/undeclared 摘要），exit code 反映是否存在阻断；sillyspec runtime list 的 KNOWN 清单登记 verify-runs

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: plan postcheck YAML 硬门报错按 js-yaml 错误类型分诊：至少覆盖半角冒号（mapping values are not allowed）、保留指示符（cannot start any token，含反引号）、流序列（expected , or ]）三类，各给中文修复动作；新增 sillyspec taskcard validate [--all|--task task-NN] 独立校验命令（frontmatter/必要字段/占位符/target_files 形态），失败 exit 1

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: API_FACE_DECLARED_RE 宽收同义声明（无接口变更/不涉及接口/零端点/无端点/0 端点），design 骨架接口段 TODO 注释附可直接粘贴的声明句式；宽收有回归测试钉住

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-04: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-05: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
