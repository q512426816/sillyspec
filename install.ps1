#Requires -Version 5.1
<#
.SYNOPSIS
    SillySpec v2.2 — Windows 一键安装
.DESCRIPTION
    从 GitHub 下载模板并生成对应 AI 工具的命令文件。
    自动检测已安装的工具，也可用 --Tool 手动指定。
.EXAMPLE
    irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex
.EXAMPLE
    irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex; sillyspec-init -Tool cursor
#>

param(
    [string]$Tool,
    [switch]$Workspace,
    [string]$Dir = "."
)

$ErrorActionPreference = "Stop"

# ── 配置 ──

$REPO   = "q512426816/sillyspec"
$BRANCH = "main"
$BASE   = "https://raw.githubusercontent.com/$REPO/$BRANCH"

$VALID_TOOLS = @("claude", "claude_skills", "cursor", "codex", "opencode", "openclaw")

$DESC = @{
    init       = "绿地项目初始化 — 深度提问、调研、需求文档、路线图"
    scan       = "代码库扫描 — 支持快速扫描和深度扫描两阶段"
    explore    = "自由思考模式 — 讨论、画图、调研，不写代码"
    brainstorm = "需求探索 — 结构化头脑风暴，生成设计文档（创建性工作前必用）"
    propose    = "生成结构化规范 — proposal + design + tasks"
    plan       = "编写实现计划 — 2-5 分钟粒度，精确到文件路径和代码"
    execute    = "波次执行 — 子代理并行 + 强制 TDD + 两阶段审查"
    verify     = "验证实现 — 对照规范检查 + 测试套件"
    archive    = "归档变更 — 规范沉淀，可追溯"
    status     = "查看项目进度和状态"
    continue_  = "自动判断并执行下一步"
    handoff    = "保存工作状态 — GSD Phase Context 模式"
    resume     = "恢复工作 — 从中断处继续"
    quick      = "快速任务 — 跳过完整流程，直接做"
    workspace  = "工作区管理 — 初始化、管理多项目工作区，查看子项目状态"
    export     = "导出成功方案为可复用模板"
}

$ARG_HINT = @{
    init       = "[项目名]"
    scan       = "[可选：指定区域，如 'api' 或 'auth'] [--deep 深度扫描]"
    explore    = "[探索主题]"
    brainstorm = "[需求或想法描述]"
    propose    = "[变更名]"
    plan       = "[计划名]"
    execute    = "[任务编号或 'all']"
    verify     = "[可选：指定验证范围]"
    archive    = "[变更名]"
    status     = ""
    continue_  = ""
    handoff    = "[交接备注]"
    resume     = ""
    quick      = "[任务描述]"
    workspace  = "[可选：add/remove/status/info]"
    export     = "<change-name> [--to <path>]"
}

$COMMANDS = @("init","scan","explore","brainstorm","propose","plan","execute",
              "verify","archive","status","continue","handoff","resume","quick",
              "workspace","export")

# ── 辅助函数 ──

function Get-Templates {
    $tempDir = Join-Path $env:TEMP "sillyspec-templates"
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    Write-Host "📥 下载模板..." -ForegroundColor Cyan
    foreach ($cmd in $COMMANDS) {
        $url = "$BASE/templates/$cmd.md"
        $out = Join-Path $tempDir "$cmd.md"
        try {
            Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        } catch {
            Write-Host "❌ 下载 $cmd.md 失败: $_" -ForegroundColor Red
            exit 1
        }
    }
    return $tempDir
}

function Get-Description($name) {
    if ($DESC.ContainsKey($name)) { return $DESC[$name] }
    return "SillySpec $name"
}

function Get-ArgHint($name) {
    if ($ARG_HINT.ContainsKey($name)) { return $ARG_HINT[$name] }
    return ""
}

function Write-Claude($name, $desc, $body, $argHint) {
    $outDir = ".claude\commands\sillyspec"
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $frontmatter = "---`r`ndescription: $desc`r`nargument-hint: `"$argHint`"`r`n---"
    Set-Content -Path "$outDir\$name.md" -Value "$frontmatter`r`n`r`n$body" -Encoding UTF8
}

function Write-ClaudeSkills($name, $desc, $body) {
    $outDir = ".claude\skills\sillyspec-$name"
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $frontmatter = "---`r`nname: sillyspec:$name`r`ndescription: $desc`r`n---"
    Set-Content -Path "$outDir\SKILL.md" -Value "$frontmatter`r`n`r`n$body" -Encoding UTF8
}

function Write-Cursor($name, $desc, $body) {
    $outDir = ".cursor\commands"
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $frontmatter = "---`r`nname: /sillyspec-$name`r`nid: sillyspec-$name`r`ndescription: $desc`r`n---"
    Set-Content -Path "$outDir\sillyspec-$name.md" -Value "$frontmatter`r`n`r`n$body" -Encoding UTF8
}

function Write-Codex($name, $desc, $body) {
    $agentsDir = Join-Path $env:USERPROFILE ".agents\skills\sillyspec-$name"
    New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null
    $frontmatter = "---`r`nname: sillyspec:$name`r`ndescription: $desc`r`n---"
    Set-Content -Path "$agentsDir\SKILL.md" -Value "$frontmatter`r`n`r`n$body" -Encoding UTF8
}

function Write-OpenCode($name, $desc, $body) {
    $outDir = ".opencode\skills\sillyspec-$name"
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $frontmatter = "---`r`nname: sillyspec:$name`r`ndescription: $desc`r`n---"
    Set-Content -Path "$outDir\SKILL.md" -Value "$frontmatter`r`n`r`n$body" -Encoding UTF8
}

function Write-OpenClaw($name, $desc, $body) {
    $outDir = ".openclaw\skills\sillyspec-$name"
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $frontmatter = "---`r`nname: sillyspec:$name`r`ndescription: $desc`r`n---"
    Set-Content -Path "$outDir\SKILL.md" -Value "$frontmatter`r`n`r`n$body" -Encoding UTF8
}

# ── 自动检测 ──

function Detect-Tools {
    $found = @()
    if (Test-Path ".claude")          { $found += "claude" }
    if (Test-Path ".claude\skills")   { $found += "claude_skills" }
    if (Test-Path ".cursor")          { $found += "cursor" }
    if (Test-Path ".opencode")        { $found += "opencode" }
    if (Test-Path ".openclaw")        { $found += "openclaw" }
    $agentsDir = Join-Path $env:USERPROFILE ".agents\skills"
    if (Test-Path $agentsDir)         { $found += "codex" }
    if ($found.Count -eq 0) { $found = @("claude") }
    return $found
}

# ── 主逻辑 ──

Push-Location $Dir

# 创建基础目录
$dirs = @(".sillyspec\codebase",".sillyspec\changes",".sillyspec\changes\archive",
          ".sillyspec\plans",".sillyspec\specs",".sillyspec\phases",
          "$env:USERPROFILE\.sillyspec\templates")
if ($Workspace) {
    $dirs += @(".sillyspec\shared",".sillyspec\workspace")
}
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}

# 确定安装工具
$tools = @()
if ($Tool) {
    if ($VALID_TOOLS -notcontains $Tool) {
        Write-Host "❌ 未知工具: $Tool" -ForegroundColor Red
        Write-Host "支持: $($VALID_TOOLS -join ', ')"
        exit 1
    }
    $tools = @($Tool)
} else {
    $tools = Detect-Tools
}

Write-Host ""
Write-Host "🤪 SillySpec v2.2 — 规范驱动开发" -ForegroundColor Magenta
Write-Host "====================================="
Write-Host ""
Write-Host "📦 安装工具: $($tools -join ', ')"
if ($Workspace) { Write-Host "📦 工作区模式" }
Write-Host ""

# 下载模板
$templateDir = Get-Templates

# 生成命令文件
$count = 0
foreach ($t in $tools) {
    Write-Host "🔧 安装 $t..." -ForegroundColor Yellow
    foreach ($cmd in $COMMANDS) {
        # PowerShell 变量名不能用 "continue"（保留字），用 continue_
        $cmdKey = if ($cmd -eq "continue") { "continue_" } else { $cmd }
        $desc = Get-Description $cmdKey
        $argHint = Get-ArgHint $cmdKey
        $body = Get-Content (Join-Path $templateDir "$cmd.md") -Raw

        switch ($t) {
            "claude"        { Write-Claude $cmd $desc $body $argHint }
            "claude_skills" { Write-ClaudeSkills $cmd $desc $body }
            "cursor"        { Write-Cursor $cmd $desc $body }
            "codex"         { Write-Codex $cmd $desc $body }
            "opencode"      { Write-OpenCode $cmd $desc $body }
            "openclaw"      { Write-OpenClaw $cmd $desc $body }
        }
        $count++
    }
    Write-Host "  ✅ $t 完成" -ForegroundColor Green
}

# 清理临时文件
Remove-Item -Recurse -Force $templateDir

Write-Host ""
Write-Host "📄 $count 个命令已安装"

# 工作区配置
if ($Workspace) {
    $configPath = ".sillyspec\config.yaml"
    if (!(Test-Path $configPath)) {
        Set-Content -Path $configPath -Value @"
# SillySpec 工作区配置
projects: {}
shared: []
"@ -Encoding UTF8
        Write-Host "📄 .sillyspec\config.yaml → 工作区配置 ✓"
    }
}

# 完成
Write-Host ""
Write-Host "====================================="
Write-Host "✅ SillySpec v2.2 安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "已安装工具: $($tools -join ', ')"
Write-Host ""
if ($Workspace) {
    Write-Host "工作区命令："
    Write-Host "  /sillyspec:workspace add    — 添加子项目"
    Write-Host "  /sillyspec:workspace status — 查看工作区状态"
} else {
    Write-Host "入口选择："
    Write-Host "  绿地项目：/sillyspec:init"
    Write-Host "  棕地项目：/sillyspec:scan"
    Write-Host "  自由思考：/sillyspec:explore `"你的想法`""
}

Pop-Location
