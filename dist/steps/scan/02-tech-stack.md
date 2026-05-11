扫描技术栈 + 数据库 Schema + 架构模式，生成 `ARCHITECTURE.md`。

参考 `.sillyspec/docs/<project>/scan/_env-detect.md`。

用 grep/rg 搜索（`@Entity`、`schema.prisma`、`models.py` 等），**禁止读源码全文**。

Schema 只记表名+说明+字段数。

输出文件必须包含以下章节：
- `## 技术栈`
- `## 架构概览`
- `## 数据模型（摘要）`

路径用反引号，不编造。保存到 `.sillyspec/docs/<project>/scan/ARCHITECTURE.md`。

完成后立即写文件，下一个 area 开始前清除源码上下文。
