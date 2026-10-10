# 任务注册表（Tasks）— 2026-10-10-release-3-32-4

- [x] task-01: 工件起草——发布 FR 三条（版本面复跑/push/钉扎通道发布双核验）+ design 四问 + 绑定不适用项声明；验证：requirements/design 本文件可读且锚齐全
- [ ] task-02: 版本面复跑——node --test test/quick-retired.test.mjs（R5=3.32.4 断言绿）；验证：零失败
- [x] task-03: git push origin main（含本变更工件与既有 34+ 提交）；验证：推送成功（8698c0d4..d33dc4c5，pre-push lint+test+docs gate 放行，docs 基线自动重锚 39→42）
- [x] task-04: 钉扎通道发布——腾讯 DoH 刷新真实 IP（104.16.11.34）→ 钉扎 npm view 预核验（latest=3.32.3，确认通道可信）→ npm publish（+ sillyspec@3.32.4，shasum a1c7bbae…，328 files）→ 传播 180s 后钉扎双核验（version=3.32.4 + dist-tags.latest=3.32.4）；验证：双核验通过，核验留痕已回填 requirements
- [ ] task-05: flow done 收口归档 + 归档推送；验证：归档注销、远端一致
