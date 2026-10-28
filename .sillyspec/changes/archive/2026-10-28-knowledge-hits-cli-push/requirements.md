---
author: flow-machine-draft
created_at: 2026-10-27T21:23:00.522Z
---
# 需求规格（Requirements）— 2026-10-28-knowledge-hits-cli-push

## 功能需求

### FR-01: appendKnowledgeHit 落盘成功后 fire 直报：local.yaml platform.url/token 在场（或 env 同名先例）→ POST {url}/api/changes/-/hits-sync（Bearer token，body 单行 lines 数组 + daemon_local_id=cli-<platform.user|cli>），照 pushAgentLogToPlatform 先例 AbortController 超时 + best-effort（网络/非 2xx warn 一行不抛，本地已落盘+daemon 兜底）

- `appendKnowledgeHit` 每次落盘成功后，必须对已落盘的那一行（序列化 JSON 串）fire 平台直报：配置读取必须复用 agent-session-log 的 `readPlatformPushConfig`（env `SILLYHUB_PLATFORM_URL`+`SILLYHUB_PLATFORM_TOKEN` 两键齐全优先，否则 local.yaml platform 段 url+token），有配置时 POST `{url}/api/changes/-/hits-sync`（Bearer token，请求体 `{lines:[<该行>], daemon_local_id:'cli'}`）；直报必须照 `pushAgentLogToPlatform` 先例 best-effort——AbortController 超时（对齐先例量级）、网络/非 2xx/超时只 warn 一行不抛（本地行已落盘、daemon 周期上行与平台按钮 flush 为兜底，服务端行级幂等去重）。

#### 场景：写后直报

- Given：specBase 配置了 platform.url/token
- When：appendKnowledgeHit 写入一条 inject 记录
- Then：落盘成功后发出一次 POST（body 含该行 JSON + daemon_local_id:'cli'），落盘与返回值语义不变

#### 场景：端点失败静默

- Given：平台不可达（网络错/超时/非 2xx）
- When：appendKnowledgeHit 写入
- Then：本地行照常落盘、函数正常返回，仅 console.warn 一行（不抛、不重试）

### FR-02: 直报不得阻塞注入主流程（void fire 不 await 不抛）；进程退出拖住由 fetch 活跃 socket 自然语义+超时兜底

- 直报必须 void fire（不 await、异常内部吞），不得改变 appendKnowledgeHit 的同步语义与返回值；进程收尾时活跃 socket 会自然拖住事件循环直至完成或超时——必须由超时上限兜底（禁止无超时的 fetch），CLI 显式 process.exit 场景直报可能被砍属接受边界（daemon 兜底覆盖）。

#### 场景：主流程不阻塞

- Given：平台响应缓慢（但未到超时）
- When：appendKnowledgeHit 写入
- Then：函数立即返回（不等待直报完成），后续代码照常执行

### FR-03: env SILLYSPEC_HITS_PUSH=0 显式关闭直报（agent-log PUSH 先例同款）；未配置 platform（未连接平台）静默跳过零日志

- `SILLYSPEC_HITS_PUSH=0` 时必须完全跳过直报（本地照写，零网络零日志）；未配置 platform 段且 env 缺省时必须静默跳过直报且零日志噪音（未连接平台是合法状态，对齐 agent-log 先例）。

#### 场景：开关关闭

- Given：env SILLYSPEC_HITS_PUSH=0 且 platform 已配置
- When：appendKnowledgeHit 写入
- Then：零 fetch 调用、零日志，本地行照常落盘

#### 场景：未连接平台

- Given：无 local.yaml platform 段、无 env 凭据
- When：appendKnowledgeHit 写入
- Then：静默跳过（零日志）

### FR-04: 单测覆盖：写后触发上报（有配置）/未配置跳过/开关关闭跳过/端点失败静默不抛且本地行不受影响

- 必须新增单测并全部通过：有配置写后触发（断言 POST 目标/请求体/Bearer 头）、未配置静默跳过、SILLYSPEC_HITS_PUSH=0 跳过、端点非 2xx/网络错静默不抛且本地行完好、runtimeDir 到 specBase 的路径反推在带尾分隔符与子路径形态下正确。

#### 场景：收口实测

- Given：实现完成
- When：跑本变更新增测试文件
- Then：全部通过

### FR-05: 跨平台兼容（Windows/Linux/macOS 路径与编码）

- 直报实现必须跨平台：runtimeDir → specBase 反推必须容忍正反斜杠与尾分隔符（Windows 路径形态），落盘行序列化保持 UTF-8（既有语义不变）。

#### 场景：Windows 路径形态

- Given：runtimeDir 形如 `C:\repo\proj\.sillyspec\.runtime\`（反斜杠+尾分隔符）
- When：反推 specBase 读 local.yaml
- Then：得到 `C:\repo\proj\.sillyspec`，配置读取成功

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-hits-push.test.mjs「写后直报：有配置触发 POST 且请求体/Bearer 头正确」
FR-01: test/knowledge-hits-push.test.mjs「端点失败静默：非 2xx/网络错 warn 一行不抛、本地行完好」
FR-02: test/knowledge-hits-push.test.mjs「直报不阻塞：appendKnowledgeHit 同步返回不等待 fetch」
FR-03: test/knowledge-hits-push.test.mjs「未配置静默跳过零日志 / SILLYSPEC_HITS_PUSH=0 关闭」
FR-04: 不适用：汇总性条款——FR-01~03/05 测试绑定行即其对账面
FR-05: test/knowledge-hits-push.test.mjs「specBase 反推跨平台路径形态（反斜杠/尾分隔符）」
