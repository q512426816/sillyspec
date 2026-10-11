---
author: flow-machine-draft
created_at: 2026-10-11T14:09:32.860Z
---
# 需求规格（Requirements）— 2026-10-11-release-3-32-5

## 功能需求

### FR-01: package.json version=3.32.5 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test test/quick-retired.test.mjs 零失败）

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: git push origin main 成功（含本变更工件、随版修复归档件与既有未推送提交；pre-push 拦截时修复而非跳过）

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: npm publish 成功且钉扎通道双核验：npm view sillyspec version=3.32.5 且 dist-tags.latest=3.32.5（发布前预核验 latest=3.32.4 已确认通道可信）

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
