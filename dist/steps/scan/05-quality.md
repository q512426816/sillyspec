扫描测试现状 + 技术债务 + 项目概览，生成 `TESTING.md`、`CONCERNS.md`、`PROJECT.md`。

参考 `.sillyspec/docs/<project>/scan/_env-detect.md`。

用 grep 搜索测试文件、TODO/FIXME、过时依赖，**禁止读源码全文**。

**TESTING.md** 必须包含测试结构（框架、目录、覆盖情况）。

**CONCERNS.md** 按严重程度分组（🔴 必须 / 🟡 建议 / 🔵 优化）。

**PROJECT.md** 包含项目基本信息。

路径用反引号，不编造。分别保存到：
- `.sillyspec/docs/<project>/scan/TESTING.md`
- `.sillyspec/docs/<project>/scan/CONCERNS.md`
- `.sillyspec/docs/<project>/scan/PROJECT.md`


