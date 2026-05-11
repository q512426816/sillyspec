扫描目录结构 + 外部集成，生成 `STRUCTURE.md` 和 `INTEGRATIONS.md`。

参考 `.sillyspec/docs/<project>/scan/_env-detect.md`。

用 find/ls/tree 和 grep，**禁止读源码全文**。

搜索 API 调用、MQ 配置、缓存、第三方 SDK。

**STRUCTURE.md** 必须包含：
- 目录树（用 tree 或 find 生成）
- 模块说明

**INTEGRATIONS.md** 按类型分组（数据库、缓存、MQ、第三方 API 等）。

路径用反引号，不编造。分别保存到：
- `.sillyspec/docs/<project>/scan/STRUCTURE.md`
- `.sillyspec/docs/<project>/scan/INTEGRATIONS.md`

完成后立即写文件，下一个 area 开始前清除源码上下文。
