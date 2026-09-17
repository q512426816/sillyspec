---
id: task-01
title: 'gate_snapshot.commands 配置键解析 + 快照构建期执行段 + config-schema 登记 + 新直测'
title_zh: 'gate_snapshot.commands 配置键解析 + 快照构建期执行段 + config-schema 登记 + 新直测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 08:59:25
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-002@v2]
allowed_paths:
  - src/run/gate-snapshot.js
  - src/config-schema.js
  - test/gate-snapshot-commands.test.mjs
target_files:
  - src/run/gate-snapshot.js
  - src/config-schema.js
  - NEW:test/gate-snapshot-commands.test.mjs
goal: >
  门禁隔离快照供给链补命令面：主仓 local.yaml 声明 gate_snapshot.commands（postinstall 类生成命令），
  快照构建期在环境目录链接/完整性预检之后、copy 面之前逐条执行，产出「本仓应然态」生成物——
  收口主仓侧生成物缺失/过期时快照内全量 lint/test 必挂的 build-id 坑（用户 2026-09-17 负面①）。
implementation:
  - 'gate-snapshot.js 新增 parseGateSnapshotCommands(yamlText)：与 parseGateSnapshotCopy 同风格段内单键扫描（gate_snapshot: 段内 commands: 块列表/inline flow 双形态，_stripYamlValue 复用，空行/注释行不破段，缩进回收出段）'
  - '新增 runGateSnapshotCommands(snapshotRoot, commands)：逐条 spawnSync(cmd, { shell: true, cwd: snapshotRoot, timeout: 300_000, encoding: utf8 })，非零退出/超时 warn（含 cmd 与输出 tail）继续下一条，返回 { ran, failed: Array<{cmd, reason}> }'
  - 'createGateSnapshot 接线：envMissing 预检通过后、applyGateSnapshotCopy 之前调 runGateSnapshotCommands（读主仓 cwd local.yaml）；有命令时 console.log 一行报备 + ⚠️ 活链接警示（命令不得改写 node_modules 等环境目录）'
  - 'config-schema.js：gate_snapshot 段 keys 增 gate_snapshot.commands 条目（optional/live，desc 含活链接警示与「只放生成物命令」建议）+ renderExample gate_snapshot 段注释扩 commands 示例'
  - 'NEW:test/gate-snapshot-commands.test.mjs：解析四态（块列表/inline flow/尾注引号剥离/未配置空）+ 执行段（成功执行产出文件、非零退出 fail-open 返回 failed、未配置 ran=0）'
acceptance:
  - 'parseGateSnapshotCommands：块列表与 inline flow 双形态均解析出命令串；未配置/读失败返回 []；段外同名键（顶层 commands:）不误收'
  - 'runGateSnapshotCommands：命令在快照根 cwd 执行且产出真实文件；非零退出/超时 warn 不抛、failed 记录、后续命令继续'
  - 'createGateSnapshot 未配置 commands 时构建路径零输出零行为（存量快照逐字节不变）'
  - 'applyGateSnapshotCopy 对命令已产出的路径跳过（dst 已存在即跳过既有行为，新鲜度优先）'
verify:
  - 'npm test -- test/gate-snapshot-commands.test.mjs'
  - 'npm test（全量回归）'
constraints:
  - '零新依赖（不引 js-yaml，本地正则解析同 parseGateSnapshotCopy 风格）'
  - '不加命令白名单（信任级与 commands.install/test/lint 同：主仓 local.yaml 用户自持配置）'
  - '不动 applyGateSnapshotCopy/copy 键解析本体；不动 detectSymlinkStoreLayout/SNAPSHOT_OFF'
  - '命令执行结果不落 meta（快照即用即弃，console 输出即审计面）'
---
