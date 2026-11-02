# 4B 执行报告

生成时间：2026-11-02T11:48:55.007Z

## 本仓重判定（防 id 漂移——执行时验证）

- decisions/unmapped：76 段 = 模板 48 + unique/不可判 7 + 待裁 duplicate 21
- fr/unmapped：210 段 = 保留 2 + 待裁 duplicate 208
- 清单：prune-map-decisions.json / prune-map-fr.json（domain=__prune__，含证据）

## 执行命令（人工核后运行）

```bash
node bin/sillyspec.js knowledge redomain-unmapped --face decisions --map C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-11-02-knowledge-redomain-map\prune-map-decisions.json --apply
node bin/sillyspec.js knowledge redomain-unmapped --face fr --map C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-11-02-knowledge-redomain-map\prune-map-fr.json --apply
```

## 移交平台（9 条 unique，指针 + 增量说明）

见 4A 归档 ledger（.sillyspec/changes/archive/2026-11-02-knowledge-provenance/redomain-provenance.json，cls=unique 且 repo=sillyspec）。增量说明：7 条 decisions unique 锚点全部「未记录」、无「变更：」行（seed 手工回填）——模块投票零命中，域建议只能人工（内容主题：daemon 授权/auth/PPM）；2 条 fr unique 同为平台功能。

## 平台建议清单

两栏见 platform-map-suggestion.json：direct 125 条（可直喂 --map）+ manual 10 条（平票/零命中，只列候选域）。注意：平台文件在漂移，执行时须重新生成；平台 fr/backend.md 有无段头孤儿字段块，--map 前先修结构。

## 头注失真（记 4C）

fr/unmapped.md 头注「本池残余 625 条」——裁剪后剩 2 条，数字修正留 4C（known-issues resolved 状态变更一并处理）。
