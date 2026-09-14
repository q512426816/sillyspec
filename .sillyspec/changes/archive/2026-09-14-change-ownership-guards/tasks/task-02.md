---
id: task-02
title: ownership-semantics-session-id-assert-and-takeover-flags
title_zh: '所有权语义——三级会话标识+首建 owner+assertChangeOwnership 三分支+五接线点（apply/cleanup/assess/归档/quick 轻量链）+--takeover/--session flag'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 20:00:04
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/sync.js
  - src/progress.js
  - src/progress/change-registry.js
  - src/index.js
  - src/run/command.js
target_files:
  - src/progress.js
  - src/progress/change-registry.js
  - src/index.js
  - src/run/command.js
expects_from:
  task-01:
    - contract: OwnershipData
      needs: [owner-session-column, heartbeat-config]
provides:
  - contract: OwnershipCheck
    fields: [assertChangeOwnership, session-id-resolution, takeover-flag]
goal: >
  所有权语义——三级会话标识解析（显式 flag/env>quick=changeName>anon@host 降级+教学 warning）+assertChangeOwnership 三分支+self 判定，锁内接线 apply/cleanup/assess 三点并注册 --takeover/--session/--skip-apply flag（FR-01/D-001@v1）。
implementation:
  - progress.js 会话标识三级解析——--session flag 优先于 env SILLYSPEC_SESSION_ID > quick 会话=changeName（既有 sessionId 机制）> anon@host 机器级降级+首次使用打 warning 教学指引导出 env；self 判定用精确字符串等值
  - change-registry.js 纯函数 assertChangeOwnership（入参 db/changeName/selfSession/nowMs/heartbeatMs，读 changes 行不写库）——三分支返回 self/takeover-stale/takeover-forced
  - 三分支语义——owner 非本会话且 now-last_active < 活跃窗（heartbeat_minutes 缺省 15）时拒绝（结构化错误列 owner+last_active+--takeover 指引）；窗口外放行并重写 owner（自动接管）；--takeover 无条件重写+result.takeover 留痕
  - index.js 锁内接线三点——apply 分支（行2741 区域）/cleanup worktree 分支（行2643 区域）/assess 自动 apply 入口（行2905 区域，SAFE/WARNING 即自动改主仓——护栏最可能的旁路）接管动作前先调 assertChangeOwnership
  - run/command.js knownFlags 白名单（行828-831、行332、行1486 区域）注册 --takeover/--session/--skip-apply 并透传——--takeover 走 index.js 子命令层解析/usage（apply/cleanup/worktree 分支），--skip-apply 本任务只注册透传不改行为（消费在 task-03）
  - run/command.js 行819 既有 --session 语义提示条目随新 flag 调整（原 quick 会话名提示改为所有权会话标识指引）
  - sync.js _progressContentEquals IGNORE_KEYS 补 owner_session（task-01 观察：版本切换窗口平台旧 v5 payload×本地 v6 脏态内容比对判不等，部署噪声落人工 conflict——last_pusher 先例 ql-20260914-006 同款一行）
acceptance:
  - 四态用例——自有 change 放行零路径变化/他人活跃 change 拒绝且列 owner+最后活跃+--takeover 指引/窗口外自动接管重写 owner/--takeover 强制接管 result 留痕
  - assess 自动 apply 旁路受校验——他人活跃 change 经 assess 路径同样被拒
  - 未配置 heartbeat_minutes 时活跃窗缺省 15 分钟
verify:
  - npm test
constraints:
  - 只读命令（status/progress show/scope-audit/docs check 等）不校验所有权，随时可查
  - 本会话自有 change 与 quick 会话豁免自身（selfSession==changeName 恒 self，quick 会话间互斥由 guard 机制既有覆盖不重复）
  - 无显式标识时 anon@host 同机并行不设防是明示局限（R-01），防线=显式标识铁律+归档收口+--takeover 摩擦
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
