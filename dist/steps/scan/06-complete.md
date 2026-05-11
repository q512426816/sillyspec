## 扫描完成

```bash
# 路径校验
for f in ARCHITECTURE STRUCTURE CONVENTIONS INTEGRATIONS TESTING CONCERNS PROJECT; do
  [ -f ".sillyspec/docs/<project>/scan/${f}.md" ] && echo "✅ ${f}.md"
done

# 生成知识库骨架
mkdir -p .sillyspec/knowledge
if [ ! -f ".sillyspec/knowledge/INDEX.md" ]; then
  cat > .sillyspec/knowledge/INDEX.md << 'EOF'
# Knowledge Index

> 子代理任务开始前查询此文件，按关键词匹配，只读命中的知识文件。
> execute/quick 执行中发现的坑自动追加到 uncategorized.md，经用户确认后归类到对应文件。

<!-- 格式：关键词1|关键词2|关键词3 → 文件路径 -->
EOF
fi
if [ ! -f ".sillyspec/knowledge/uncategorized.md" ]; then
  cat > .sillyspec/knowledge/uncategorized.md << 'EOF'
# 未分类知识

> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。
EOF
fi

# 记录状态
cat > .sillyspec/STATE.md << 'EOF'
# 项目状态

## 最近活动
- $(date '+%Y-%m-%d %H:%M:%S') scan 完成
EOF

# 清理
rm -f .sillyspec/docs/<project>/scan/_env-detect.md
git add .sillyspec/
```

### 自检门控
- [ ] ARCHITECTURE.md：技术栈 + Schema 摘要？
- [ ] CONVENTIONS.md：隐形规则 + 代码风格？
- [ ] STRUCTURE.md：目录结构？
- [ ] INTEGRATIONS.md：外部依赖？
- [ ] TESTING.md：测试现状？
- [ ] CONCERNS.md：技术债务？
- [ ] PROJECT.md：项目概览？
