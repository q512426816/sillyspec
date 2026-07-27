/**
 * 构建 docs/prompt/index.html —— 单文件自包含 H5 展示页。
 * 数据来自 _extracted.json（机械提取自源码）。改 prompt 后重跑：
 *   node docs/prompt/_extract.mjs && node docs/prompt/_build-site.mjs
 *
 * 设计方向：Technical Manuscript（暖暗底 + ochre + Fraunces/IBM Plex Mono）。
 * 约束：app JS 不用模板字面量（避免 build 脚本模板插值冲突），数据用 JSON island 内联。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('./', import.meta.url))
const extracted = JSON.parse(readFileSync(new URL('./_extracted.json', import.meta.url), 'utf8'))

// 阶段元信息（title/type/persona/order 来自 README 总览表；description 从 JSON 取）
const META = {
  brainstorm:       { title: '头脑风暴',       type: '主流程', persona: '资深架构师',   order: 1 },
  plan:             { title: '实现计划',       type: '主流程', persona: '技术项目经理', order: 2 },
  execute:          { title: '波次执行',       type: '主流程', persona: '高级工程师',   order: 3 },
  verify:           { title: '验证',           type: '主流程', persona: 'QA 专家',      order: 4 },
  scan:             { title: '项目扫描',       type: '辅助',   persona: null,           order: 5 },
  quick:            { title: '快速任务',       type: '辅助',   persona: '全栈老兵',     order: 6 },
  explore:          { title: '自由探索',       type: '辅助',   persona: '技术探索伙伴', order: 7 },
  archive:          { title: '归档',           type: '辅助',   persona: null,           order: 8 },
  status:           { title: '状态',           type: '辅助',   persona: null,           order: 9 },
  doctor:           { title: '自检',           type: '辅助',   persona: null,           order: 10 },
  'brainstorm-auto':{ title: '自动模式头脑风暴', type: '变体', persona: null,           order: 11 },
  propose:          { title: 'propose · 已废弃', type: '已废弃', persona: null,         order: 12, deprecated: true }
}

const STEP_KEYS = ['id', 'mode', 'outputHint', 'optional', 'requiresWait', 'conditionalWait', 'repeatableWait', 'maxWaitRounds', 'waitReason', 'waitOptions', 'noAI', '_cliAction', 'migratedFrom']

const stages = []
for (const [name, v] of Object.entries(extracted)) {
  const m = META[name] || { title: name, type: '辅助', persona: null, order: 99 }
  const steps = (v.steps || []).map((s, i) => {
    const step = { idx: i, name: s.name || ('Step ' + (i + 1)), prompt: s.prompt || '' }
    for (const k of STEP_KEYS) if (s[k] !== undefined) step[k] = s[k]
    return step
  })
  stages.push({
    name, title: m.title, type: m.type, persona: m.persona, order: m.order,
    deprecated: !!m.deprecated, auxiliary: !!v.auxiliary,
    description: v.description || '', sourceFile: v.sourceFile || ('src/stages/' + name + '.js'),
    dynamic: v.dynamic || null, demoNote: v.demoNote || null,
    globalGuardrails: v.globalGuardrails || null,
    steps
  })
}
stages.sort((a, b) => a.order - b.order)

const stats = {
  stages: stages.length,
  steps: stages.reduce((n, s) => n + s.steps.length, 0),
  chars: stages.reduce((n, s) => n + s.steps.reduce((m, st) => m + (st.prompt || '').length, 0), 0)
}

const dataJson = JSON.stringify({ stages, stats })

// ── CSS（无 ${} 插值，安全放在模板字面量里）──
const CSS = `
:root{
  --bg:#14110d; --bg-elev:#1b1712; --bg-card:#211c15; --bg-code:#0e0c09;
  --ink:#e9e2d0; --ink-dim:#a59a82; --ink-faint:#665e4d; --line:#322a1f; --line-soft:#241f17;
  --accent:#d4a24c; --accent-deep:#a8732a; --accent-glow:rgba(212,162,76,.16);
  --ph-path:#6fb3b8; --ph-scalar:#b7c95e; --ph-include:#d06a9e;
  --danger:#c8553d; --ok:#7a9e7e;
  --mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular","PingFang SC","Microsoft YaHei",monospace;
  --serif:"Fraunces","PingFang SC","Hiragino Sans GB","Microsoft YaHei",serif;
  --sans:"IBM Plex Mono","PingFang SC","Microsoft YaHei",sans-serif;
}
[data-theme="light"]{
  --bg:#f1ebdc; --bg-elev:#e8e0cc; --bg-card:#fbf5e6; --bg-code:#e4dcc6;
  --ink:#241e15; --ink-dim:#6a6149; --ink-faint:#9a9078; --line:#d2c7a8; --line-soft:#ded3b6;
  --accent:#9a6b1f; --accent-deep:#7a5210; --accent-glow:rgba(154,107,31,.14);
  --ph-path:#2f6f74; --ph-scalar:#5d7a1e; --ph-include:#a04a72;
  --danger:#a83a26; --ok:#3f6443;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased}
body{
  background-image:
    radial-gradient(circle at 18% -10%,var(--accent-glow),transparent 42%),
    radial-gradient(circle at 95% 8%,rgba(111,179,184,.06),transparent 35%);
  min-height:100vh;
}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")}
button{font-family:var(--mono);cursor:pointer}

/* topbar */
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;padding:14px 26px;
  background:linear-gradient(var(--bg) 60%,rgba(20,17,13,0));border-bottom:1px solid var(--line);backdrop-filter:blur(6px)}
.brand{display:flex;align-items:baseline;gap:10px;min-width:230px}
.brand .mark{font-family:var(--serif);font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--ink)}
.brand .mark em{font-style:italic;color:var(--accent);font-weight:600}
.brand .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
.search{flex:1;max-width:440px;position:relative}
.search input{width:100%;background:var(--bg-elev);border:1px solid var(--line);color:var(--ink);
  font-family:var(--mono);font-size:13px;padding:9px 12px 9px 34px;border-radius:3px;outline:none;transition:border-color .15s}
.search input:focus{border-color:var(--accent)}
.search input::placeholder{color:var(--ink-faint)}
.search::before{content:"⌕";position:absolute;left:11px;top:7px;font-size:15px;color:var(--ink-faint)}
.top-actions{display:flex;align-items:center;gap:10px;margin-left:auto}
.stat{font-size:10px;letter-spacing:.12em;color:var(--ink-faint);text-transform:uppercase}
.stat b{color:var(--accent);font-weight:600}
.theme-btn{background:var(--bg-elev);border:1px solid var(--line);color:var(--ink-dim);padding:7px 11px;border-radius:3px;font-size:13px}
.theme-btn:hover{color:var(--accent);border-color:var(--accent)}

/* ruler */
.ruler{height:14px;border-bottom:1px solid var(--line-soft);position:relative;overflow:hidden}
.ruler i{position:absolute;top:0;height:100%;width:1px;background:var(--line)}
.ruler i.maj{height:8px;background:var(--ink-faint)}

/* layout */
.layout{display:flex;max-width:1480px;margin:0 auto;position:relative;z-index:1}
.sidebar{width:268px;flex-shrink:0;padding:22px 14px 60px 22px;border-right:1px solid var(--line-soft);
  position:sticky;top:54px;align-self:flex-start;max-height:calc(100vh - 54px);overflow-y:auto}
.nav-group{margin-bottom:18px}
.nav-group-title{display:flex;align-items:center;justify-content:space-between;font-size:10px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--ink-faint);padding:0 8px 8px;border-bottom:1px dashed var(--line-soft);margin-bottom:6px}
.nav-group-title span{color:var(--accent);font-weight:600}
.nav-item{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:3px;cursor:pointer;
  color:var(--ink-dim);text-decoration:none;border-left:2px solid transparent;transition:all .12s}
.nav-item:hover{background:var(--bg-elev);color:var(--ink)}
.nav-item.active{background:var(--bg-elev);color:var(--ink);border-left-color:var(--accent)}
.nav-item.dep{color:var(--danger);opacity:.7}
.nav-num{font-size:10px;color:var(--ink-faint);font-weight:500;width:18px}
.nav-item.active .nav-num{color:var(--accent)}
.nav-name{flex:1;font-size:13px;font-family:var(--mono)}
.nav-count{font-size:10px;color:var(--ink-faint);background:var(--bg-code);padding:1px 6px;border-radius:8px}

.content{flex:1;min-width:0;padding:30px 44px 120px}

/* stage head */
.stage-kicker{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:8px}
.stage-title{font-family:var(--serif);font-weight:800;font-size:46px;line-height:1.05;letter-spacing:-.025em;margin:0 0 10px}
.stage-title .dep-tag{font-size:13px;font-family:var(--mono);color:var(--danger);vertical-align:middle;margin-left:10px;background:rgba(200,85,61,.12);padding:3px 8px;border-radius:3px}
.stage-desc{color:var(--ink-dim);font-size:14px;margin:0 0 16px;max-width:640px}
.meta-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px}
.chip{font-size:11px;font-family:var(--mono);background:var(--bg-card);border:1px solid var(--line);padding:3px 9px;border-radius:2px;color:var(--ink-dim)}
.chip k{color:var(--ink-faint);margin-right:5px}
.chip v{color:var(--accent)}

/* guardrails */
.guardrails{margin:22px 0;padding:16px 18px;background:rgba(200,85,61,.06);border:1px solid rgba(200,85,61,.3);border-left:3px solid var(--danger);border-radius:2px}
.guardrails .gr-title{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--danger);font-weight:600;margin-bottom:10px}

/* demo note */
.demo-note{margin:18px 0;padding:12px 16px;background:var(--accent-glow);border:1px solid var(--accent);border-radius:2px;font-size:12px;color:var(--ink-dim)}
.demo-note b{color:var(--accent)}

/* toolbar */
.step-toolbar{display:flex;align-items:center;gap:10px;margin:26px 0 14px;padding-top:14px;border-top:1px solid var(--line-soft)}
.step-toolbar button{background:transparent;border:1px solid var(--line);color:var(--ink-dim);padding:5px 11px;border-radius:3px;font-size:11px;letter-spacing:.06em}
.step-toolbar button:hover{color:var(--accent);border-color:var(--accent)}
.step-toolbar .step-count{margin-left:auto;font-size:10px;letter-spacing:.18em;color:var(--ink-faint)}

/* steps */
.steps{display:flex;flex-direction:column;gap:10px}
.step{background:var(--bg-card);border:1px solid var(--line);border-radius:3px;overflow:hidden;transition:border-color .15s}
.step:hover{border-color:var(--line-soft)}
.step.open{border-color:var(--accent)}
.step-head{display:flex;align-items:center;gap:14px;padding:13px 16px;cursor:pointer;user-select:none}
.step-num{font-family:var(--mono);font-size:11px;color:var(--ink-faint);letter-spacing:.05em;white-space:nowrap}
.step.open .step-num{color:var(--accent)}
.step-name{font-family:var(--mono);font-weight:500;font-size:14px;color:var(--ink);flex:1;min-width:0}
.step-tags{display:flex;gap:5px;flex-wrap:wrap}
.tag{font-size:9.5px;font-family:var(--mono);padding:2px 6px;border-radius:2px;letter-spacing:.04em;border:1px solid var(--line);color:var(--ink-dim);background:var(--bg-elev)}
.tag-opt{color:var(--ph-scalar);border-color:rgba(183,201,94,.3)}
.tag-wait{color:var(--ph-path);border-color:rgba(111,179,184,.3)}
.tag-noai{color:var(--ink-faint)}
.tag-mode{color:var(--accent);border-color:rgba(212,162,76,.3)}
.step-chev{color:var(--ink-faint);transition:transform .18s;font-size:13px}
.step.open .step-chev{transform:rotate(90deg);color:var(--accent)}
.step-body{padding:0 16px 16px;border-top:1px solid var(--line-soft)}
.meta-rows{display:flex;flex-direction:column;gap:4px;margin:14px 0 12px;font-size:12px}
.meta-row{display:flex;gap:10px}
.meta-row k{color:var(--ink-faint);font-family:var(--mono);min-width:110px}
.meta-row v{color:var(--ink-dim);font-family:var(--mono)}
.ph-summary{font-size:11px;color:var(--ink-faint);margin:6px 0 12px;font-family:var(--mono)}
.ph-summary .pp{color:var(--ph-path)}.ph-summary .ps{color:var(--ph-scalar)}.ph-summary .pi{color:var(--ph-include)}

/* prompt body */
.prompt-body{font-family:var(--mono);font-size:12.5px;line-height:1.7;color:var(--ink);
  background:var(--bg-code);border:1px solid var(--line-soft);border-radius:3px;padding:14px 16px;
  white-space:pre-wrap;word-break:break-word;overflow-x:auto}
.prompt-body .md-h{display:block;font-weight:600;color:var(--ink);font-size:12.5px;margin-top:8px}
.prompt-body .md-h:first-child{margin-top:0}
.prompt-body .md-h2{font-size:13.5px;color:var(--accent)}
.prompt-body .inline-code{background:var(--bg-elev);padding:0 4px;border-radius:2px;color:var(--ph-scalar);font-size:12px}
.prompt-body .ph{padding:0 2px;border-radius:2px;font-weight:500}
.prompt-body .ph-path{color:var(--ph-path);background:rgba(111,179,184,.1)}
.prompt-body .ph-scalar{color:var(--ph-scalar);background:rgba(183,201,94,.1)}
.prompt-body .ph-include{color:var(--ph-include);background:rgba(208,106,158,.12)}
.code-block{background:var(--bg);border:1px solid var(--line);border-radius:2px;padding:12px 14px;margin:10px 0;
  overflow-x:auto;font-size:12px;color:var(--ink-dim)}
.code-block code{white-space:pre;font-family:var(--mono)}

/* search results */
.sr-empty{padding:40px 0;text-align:center;color:var(--ink-faint);font-family:var(--mono)}
.sr-group{margin-bottom:24px}
.sr-group-h{font-family:var(--serif);font-weight:600;font-size:18px;color:var(--accent);margin-bottom:8px}

/* footer */
.foot{padding:24px 44px 60px;color:var(--ink-faint);font-size:11px;font-family:var(--mono);border-top:1px solid var(--line-soft);margin-top:40px}

@media(max-width:900px){
  .sidebar{display:none}
  .content{padding:20px 18px 80px}
  .stage-title{font-size:34px}
  .brand{min-width:auto}
}
`

// ── app JS（纯字符串拼接，无模板字面量，避免 build 脚本插值冲突）──
const APP = [
'var D=JSON.parse(document.getElementById("stages-data").textContent);',
'var STAGES=D.stages,STATS=D.stats;',
'var cur=STAGES[0].name, expanded={}, theme=localStorage.getItem("ss-theme")||"dark", q="";',
'document.documentElement.setAttribute("data-theme",theme);',
'function $(s,r){return (r||document).querySelector(s)}',
'function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}',
'function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}',
'function H(){return Array.prototype.join.call(arguments,"")}',
'',
'// ── prompt 渲染：代码块 + 占位符 + 行内 code + 轻量 markdown 标题 ──',
'function hlPh(s){',
'  s=s.replace(/\\{\\{include:\\s*([\\w-]+)\\s*\\}\\}/g,"<span class=\\"ph ph-include\\">{{include: $1}}</span>");',
'  s=s.replace(/\\{([A-Z_][A-Z0-9_]*)\\}/g,"<span class=\\"ph ph-path\\">{$1}</span>");',
'  s=s.replace(/&lt;(\\/?[a-zA-Z][\\w-]*)&gt;/g,"<span class=\\"ph ph-scalar\\">&lt;$1&gt;</span>");',
'  return s;',
'}',
'function renderPrompt(text){',
'  if(!text) return "<i style=\\"color:var(--ink-faint)\\">【noAI 步骤，无 prompt — CLI 内部执行】</i>";',
'  var escTxt=esc(text);',
'  var parts=escTxt.split(/(```[\\s\\S]*?```)/g);',
'  var out="";',
'  for(var i=0;i<parts.length;i++){',
'    var p=parts[i];',
'    if(p.length>=6 && p.slice(0,3)==="```" && p.slice(-3)==="```"){',
'      var inner=p.replace(/^```[^\\n]*\\n?/,"").replace(/```$/,"");',
'      out+="<pre class=\\"code-block\\"><code>"+hlPh(inner)+"</code></pre>";',
'    } else { out+=renderInline(p); }',
'  }',
'  return out;',
'}',
'function renderInline(s){',
'  s=hlPh(s);',
'  s=s.replace(/`([^`\\n]+)`/g,"<code class=\\"inline-code\\">$1</code>");',
'  s=s.replace(/^(#{1,6})\\s+(.+)$/gm,function(_,h,c){return "<span class=\\"md-h md-h"+h.length+"\\">"+h+" "+c+"</span>"});',
'  return s;',
'}',
'',
'// ── 占位符汇总（一个 step 里出现哪些）──',
'function phOf(text){',
'  if(!text) return [];',
'  var set={};',
'  var re=/\\{\\{include:[\\w-]+\\}\\}|\\{[A-Z_][A-Z0-9_]*\\}|&lt;\\/?[a-zA-Z][\\w-]*&gt;/g;',
'  var m; text=esc(text);',
'  while((m=re.exec(text))){ set[m[0]]=1; }',
'  return Object.keys(set);',
'}',
'',
'// ── 渲染 ──',
'function chip(k,v,cls){return H("<span class=\\"chip ",cls||"","\\"><k>",esc(k),"</k><v>",esc(v),"</v></span>")}',
'function renderNav(){',
'  var g={"主流程":[],"辅助":[],"变体":[],"已废弃":[]};',
'  STAGES.forEach(function(s){ (g[s.type]||g["辅助"]).push(s); });',
'  var h="";',
'  ["主流程","辅助","变体","已废弃"].forEach(function(t){',
'    if(!g[t].length) return;',
'    h+=H("<div class=\\"nav-group\\"><div class=\\"nav-group-title\\">",t,"<span>",g[t].length,"</span></div>");',
'    g[t].forEach(function(s){',
'      var a=s.name===cur?" active":""; if(s.deprecated) a+=" dep";',
'      h+=H("<a class=\\"nav-item",a,"\\" data-stage=\\"",s.name,"\\"><span class=\\"nav-num\\">",String(s.order).padStart(2,"0"),"</span><span class=\\"nav-name\\">",esc(s.title),"</span><span class=\\"nav-count\\">",s.steps.length,"</span></a>");',
'    });',
'    h+="</div>";',
'  });',
'  return h;',
'}',
'function renderStage(s){',
'  var h=H("<div class=\\"stage-kicker\\">",esc(s.type.toUpperCase())," · STAGE ",String(s.order).padStart(2,"0"),"</div>");',
'  h+=H("<h1 class=\\"stage-title\\">",esc(s.title), s.deprecated?"<span class=\\"dep-tag\\">DEPRECATED</span>":"","</h1>");',
'  h+=H("<p class=\\"stage-desc\\">",esc(s.description),"</p>");',
'  h+="<div class=\\"meta-chips\\">";',
'  h+=chip("source",s.sourceFile);',
'  if(s.persona) h+=chip("persona",s.persona);',
'  h+=chip("steps",s.steps.length);',
'  if(s.auxiliary) h+=chip("type","auxiliary");',
'  h+="</div>";',
'  if(s.globalGuardrails){ h+=H("<section class=\\"guardrails\\"><div class=\\"gr-title\\">⛔ 全局护栏 _globalGuardrails（首步注入全文）</div><div class=\\"prompt-body\\">",renderPrompt(s.globalGuardrails),"</div></section>"); }',
'  if(s.demoNote) h+=H("<div class=\\"demo-note\\"><b>⚠ 动态示例：</b>",esc(s.demoNote),"</div>");',
'  h+=H("<div class=\\"step-toolbar\\"><button id=\\"expand-all\\">全部展开</button><button id=\\"collapse-all\\">全部折叠</button><div class=\\"step-count\\">",s.steps.length," STEPS</div></div>");',
'  h+="<div class=\\"steps\\">";',
'  s.steps.forEach(function(st,i){ h+=renderStep(s,st,i); });',
'  h+="</div>";',
'  return h;',
'}',
'function renderStep(s,st,i){',
'  var path=s.name+"#"+i, open=!!expanded[path];',
'  var tags="";',
'  function tag(label,cls){ tags+=H("<span class=\\"tag ",cls,"\\">",esc(label),"</span>"); }',
'  if(st.optional) tag("optional","tag-opt");',
'  if(st.requiresWait) tag("requiresWait","tag-wait");',
'  if(st.conditionalWait) tag("conditionalWait","tag-wait");',
'  if(st.repeatableWait) tag("repeatable×"+(st.maxWaitRounds||"?"),"tag-wait");',
'  if(st.noAI) tag("noAI","tag-noai");',
'  if(st.mode) tag(st.mode,"tag-mode");',
'  if(st.id) tag(st.id);',
'  var num=String(i+1).padStart(2,"0")+" / "+String(s.steps.length).padStart(2,"0");',
'  var h=H("<article class=\\"step",open?" open":"","\\" data-path=\\"",path,"\\"><header class=\\"step-head\\"><span class=\\"step-num\\">",num,"</span><span class=\\"step-name\\">",esc(st.name),"</span><span class=\\"step-tags\\">",tags,"</span><span class=\\"step-chev\\">▸</span></header>");',
'  if(open){',
'    h+="<div class=\\"step-body\\"><div class=\\"meta-rows\\">";',
'    [["outputHint",st.outputHint],["waitReason",st.waitReason],["waitOptions",st.waitOptions?st.waitOptions.join(", "):null],["migratedFrom",st.migratedFrom?st.migratedFrom.join(", "):null]].forEach(function(r){ if(r[1]) h+=H("<div class=\\"meta-row\\"><k>",r[0],"</k><v>",esc(r[1]),"</v></div>"); });',
'    h+="</div>";',
'    var phs=phOf(st.prompt);',
'    if(phs.length){ var phHtml=phs.map(function(p){var c=p.indexOf("{{")===0?"pi":(p.indexOf("&lt;")===0?"ps":"pp");return "<span class=\\""+c+"\\">"+p+"</span>"}).join("  "); h+=H("<div class=\\"ph-summary\\">占位符：",phHtml,"</div>"); }',
'    h+=H("<div class=\\"prompt-body\\">",renderPrompt(st.prompt),"</div></div>");',
'  }',
'  h+="</article>";',
'  return h;',
'}',
'',
'function pickStage(name){ cur=name; expanded={}; render(); }',
'function toggleStep(path){ expanded[path]=!expanded[path]; render(); }',
'function expandAll(b){ var s=byName(cur); if(!s) return; s.steps.forEach(function(st,i){ expanded[cur+"#"+i]=b; }); render(); }',
'function byName(n){ for(var i=0;i<STAGES.length;i++) if(STAGES[i].name===n) return STAGES[i]; return null; }',
'',
'function search(query){',
'  q=query.trim().toLowerCase(); render();',
'}',
'function renderSearch(){',
'  if(!q){ $(".content").innerHTML=renderStage(byName(cur)); return; }',
'  var h=""; var total=0;',
'  STAGES.forEach(function(s){',
'    var hits=[]; s.steps.forEach(function(st,i){',
'      var hay=(st.name+" "+st.prompt+" "+(st.outputHint||"")).toLowerCase();',
'      if(hay.indexOf(q)>=0) hits.push({st:st,i:i});',
'    });',
'    if(!hits.length) return;',
'    total+=hits.length;',
'    h+=H("<div class=\\"sr-group\\"><div class=\\"sr-group-h\\">",esc(s.title)," <span style=\\"font-size:11px;color:var(--ink-faint);font-family:var(--mono)\\">",hits.length," match</span></div><div class=\\"steps\\">");',
'    hits.forEach(function(x){ expanded[s.name+"#"+x.i]=true; h+=renderStep(s,x.st,x.i); });',
'    h+="</div></div>";',
'  });',
'  $(".content").innerHTML = total? h : H("<div class=\\"sr-empty\\">未命中 “",esc(q),"”</div>");',
'}',
'',
'function render(){',
'  $(".nav").innerHTML=renderNav();',
'  if(q) renderSearch(); else $(".content").innerHTML=renderStage(byName(cur));',
'  bindStage();',
'}',
'function bindStage(){',
'  $$(".nav-item").forEach(function(el){ el.onclick=function(){ q=""; $(".search input").value=""; pickStage(el.getAttribute("data-stage")); }; });',
'  $$(".step-head").forEach(function(el){ var step=el.parentNode; el.onclick=function(){ toggleStep(step.getAttribute("data-path")); }; });',
'  var ea=$("#expand-all"), ca=$("#collapse-all");',
'  if(ea) ea.onclick=function(){ expandAll(true); };',
'  if(ca) ca.onclick=function(){ expandAll(false); };',
'}',
'',
'// ruler ticks',
'(function(){',
'  var r=$(".ruler"); if(!r) return;',
'  var w=r.clientWidth||1400, step=14, html="";',
'  for(var x=0;x<w;x+=step){ html+="<i"+(x%(step*5)===0?" class=\\"maj\\"":"")+" style=\\"left:"+x+"px\\"></i>"; }',
'  r.innerHTML=html;',
'})();',
'',
'$(".search input").addEventListener("input",function(e){ search(e.target.value); });',
'$(".theme-btn").addEventListener("click",function(){ theme=theme==="dark"?"light":"dark"; document.documentElement.setAttribute("data-theme",theme); localStorage.setItem("ss-theme",theme); });',
'',
'$(".stat-stages").textContent=STATS.stages; $(".stat-steps").textContent=STATS.steps; $(".stat-chars").textContent=Math.round(STATS.chars/1000)+"k";',
'render();'
].join('\n')

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SillySpec · 阶段提示词档案 / Prompt Dossier</title>
<meta name="description" content="SillySpec 各阶段 CLI→Agent 提示词参考">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="topbar">
  <div class="brand">
    <span class="mark">Silly<em>Spec</em></span>
    <span class="sub">Prompt Dossier</span>
  </div>
  <div class="search"><input type="text" placeholder="搜索步骤名 / prompt 内容 / 占位符…"></div>
  <div class="top-actions">
    <span class="stat"><b class="stat-stages">0</b> stages · <b class="stat-steps">0</b> steps · <b class="stat-chars">0</b></span>
    <button class="theme-btn" title="切换主题">◐</button>
  </div>
</header>
<div class="ruler"></div>
<div class="layout">
  <nav class="sidebar nav"></nav>
  <main class="content"></main>
</div>
<footer class="foot">
  数据机械提取自 <code>src/stages/*.js</code> · 单文件自包含 · file:// 可直接打开 ·
  生成命令：<code>node docs/prompt/_build-site.mjs</code>
</footer>
<script type="application/json" id="stages-data">${dataJson}</script>
<script>${APP}</script>
</body>
</html>`

writeFileSync(new URL('./index.html', import.meta.url), html, 'utf8')
console.log('✅ built docs/prompt/index.html')
console.log('   stages=' + stats.stages + ' steps=' + stats.steps + ' promptChars=' + stats.chars + ' size=' + Math.round(html.length / 1024) + 'KB')
