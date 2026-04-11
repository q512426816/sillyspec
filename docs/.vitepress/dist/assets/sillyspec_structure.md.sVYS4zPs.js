import{_ as a,o as n,c as t,ae as p}from"./chunks/framework.Czhw_PXq.js";const m=JSON.parse('{"title":"目录结构","description":"","frontmatter":{},"headers":[],"relativePath":"sillyspec/structure.md","filePath":"sillyspec/structure.md"}'),e={name:"sillyspec/structure.md"};function l(i,s,d,r,c,o){return n(),t("div",null,[...s[0]||(s[0]=[p(`<h1 id="目录结构" tabindex="-1">目录结构 <a class="header-anchor" href="#目录结构" aria-label="Permalink to &quot;目录结构&quot;">​</a></h1><h2 id="sillyspec-完整结构" tabindex="-1">.sillyspec/ 完整结构 <a class="header-anchor" href="#sillyspec-完整结构" aria-label="Permalink to &quot;.sillyspec/ 完整结构&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>.sillyspec/</span></span>
<span class="line"><span>├── changes/              ← 所有变更（design/proposal/tasks/requirements）</span></span>
<span class="line"><span>│   └── &lt;change-name&gt;/</span></span>
<span class="line"><span>│       ├── design.md          # 设计文档（架构决策、文件变更清单）</span></span>
<span class="line"><span>│       ├── proposal.md        # 变更提案（动机、范围、成功标准）</span></span>
<span class="line"><span>│       ├── requirements.md    # 需求文档（功能需求、用户场景）</span></span>
<span class="line"><span>│       ├── plan.md            # 实现计划总览（PM 视角，任务列表 + Wave 划分）</span></span>
<span class="line"><span>│       └── tasks/             # 任务蓝图目录</span></span>
<span class="line"><span>│           ├── task-01.md     # 独立任务蓝图（接口定义、边界处理、TDD 步骤、验收标准）</span></span>
<span class="line"><span>│           ├── task-02.md</span></span>
<span class="line"><span>│           └── ...</span></span>
<span class="line"><span>├── docs/                 ← 统一文档中心</span></span>
<span class="line"><span>│   └── &lt;project&gt;/</span></span>
<span class="line"><span>│       └── scan/         ← 代码扫描结果</span></span>
<span class="line"><span>│           ├── CONVENTIONS.md   # 代码规范</span></span>
<span class="line"><span>│           └── ARCHITECTURE.md  # 架构文档</span></span>
<span class="line"><span>├── knowledge/            ← 知识库（归档沉淀）</span></span>
<span class="line"><span>│   ├── INDEX.md          # 知识索引</span></span>
<span class="line"><span>│   └── uncategorized.md  # 未分类知识</span></span>
<span class="line"><span>├── projects/             ← 子项目注册（*.yaml）</span></span>
<span class="line"><span>├── local.yaml            ← 本地配置（构建命令、测试命令、环境变量）</span></span>
<span class="line"><span>└── .runtime/             ← 运行时数据</span></span>
<span class="line"><span>    ├── progress.json     ← 唯一进度数据源</span></span>
<span class="line"><span>    ├── artifacts/        ← 步骤输出完整内容</span></span>
<span class="line"><span>    ├── logs/             ← 日志</span></span>
<span class="line"><span>    └── history/          ← 历史快照</span></span></code></pre></div><h2 id="文档层级" tabindex="-1">文档层级 <a class="header-anchor" href="#文档层级" aria-label="Permalink to &quot;文档层级&quot;">​</a></h2><table tabindex="0"><thead><tr><th>文档</th><th>谁写</th><th>回答什么</th><th>详细程度</th></tr></thead><tbody><tr><td>design.md</td><td>brainstorm（架构师）</td><td>为什么这么设计？架构长什么样？</td><td>中</td></tr><tr><td>plan.md</td><td>plan（项目经理）</td><td>做哪些任务？什么顺序？</td><td>低（总览）</td></tr><tr><td>task-N.md</td><td>plan（项目经理）</td><td>这个任务具体怎么做？</td><td>高（蓝图级）</td></tr><tr><td>CONVENTIONS.md</td><td>scan</td><td>代码怎么写？风格、命名、模式？</td><td>高</td></tr><tr><td>local.yaml</td><td>用户</td><td>构建命令、测试命令、环境变量</td><td>配置</td></tr></tbody></table><h2 id="产出时机" tabindex="-1">产出时机 <a class="header-anchor" href="#产出时机" aria-label="Permalink to &quot;产出时机&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>brainstorm → design.md + proposal.md + requirements.md + tasks.md</span></span>
<span class="line"><span>plan       → plan.md + tasks/task-NN.md</span></span>
<span class="line"><span>execute    → 代码 + 勾选 task-N.md 验收标准</span></span>
<span class="line"><span>verify     → 对照 design.md + 检查 task-N.md 验收 + 测试</span></span>
<span class="line"><span>archive    → 沉淀到 knowledge/</span></span></code></pre></div><h2 id="说明" tabindex="-1">说明 <a class="header-anchor" href="#说明" aria-label="Permalink to &quot;说明&quot;">​</a></h2><ul><li><strong>changes/</strong> — 所有变更规范统一存放</li><li><strong>tasks/</strong> — 每个任务独立蓝图，execute 子代理只读自己的蓝图就能干活</li><li><strong>projects/</strong> — 管理多个子项目</li><li><strong>docs/</strong> — 文档中心，主要存放代码扫描结果</li><li><strong>knowledge/</strong> — 归档沉淀的可复用知识</li><li><strong>local.yaml</strong> — 项目特有的构建/测试命令，所有阶段都会读取</li><li><strong>.runtime/</strong> — 运行时数据，progress.json 是唯一进度数据源</li></ul>`,9)])])}const g=a(e,[["render",l]]);export{m as __pageData,g as default};
