<#
.SYNOPSIS
    SillySpec v2.2 — Windows 一键安装
.DESCRIPTION
    从 GitHub 下载模板并生成对应 AI 工具的命令文件。
.EXAMPLE
    powershell -c "irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex"
#>

$ErrorActionPreference = "Stop"

$REPO   = "q512426816/sillyspec"
$BRANCH = "main"
$BASE   = "https://raw.githubusercontent.com/$REPO/$BRANCH"
$VERSION = "2.2"

$COMMANDS = @("init","scan","explore","brainstorm","propose","plan","execute",
              "verify","archive","status","continue","handoff","resume","quick",
              "workspace","export")

# ── 元数据 ──

function Get-Desc($name) {
    switch ($name) {
        "init"       { return "绿地项目初始化 — 深度提问、调研、需求文档、路线图" }
        "scan"       { return "代码库扫描 — 支持快速扫描和深度扫描两阶段" }
        "explore"    { return "自由思考模式 — 讨论、画图、调研，不写代码" }
        "brainstorm" { return "需求探索 — 结构化头脑风暴，生成设计文档" }
        "propose"    { return "生成结构化规范 — proposal + design + tasks" }
        "plan"       { return "编写实现计划 — 精确到文件路径和代码" }
        "execute"    { return "波次执行 — 子代理并行 + 强制 TDD + 两阶段审查" }
        "verify"     { return "验证实现 — 对照规范检查 + 测试套件" }
        "archive"    { return "归档变更 — 规范沉淀，可追溯" }
        "status"     { return "查看项目进度和状态" }
        "continue"   { return "自动判断并执行下一步" }
        "handoff"    { return "保存工作状态" }
        "resume"     { return "恢复工作 — 从中断处继续" }
        "quick"      { return "快速任务 — 跳过完整流程，直接做" }
        "workspace"  { return "工作区管理 — 多项目工作区" }
        "export"     { return "导出成功方案为可复用模板" }
        default      { return "SillySpec $name" }
    }
}

function Get-ArgHint($name) {
    switch ($name) {
        "init"       { return "[项目名]" }
        "scan"       { return "[可选：指定区域] [--deep 深度扫描]" }
        "explore"    { return "[探索主题]" }
        "brainstorm" { return "[需求或想法描述]" }
        "propose"    { return "[变更名]" }
        "plan"       { return "[计划名]" }
        "execute"    { return "[任务编号或 'all']" }
        "verify"     { return "[可选：指定验证范围]" }
        "archive"    { return "[变更名]" }
        "handoff"    { return "[交接备注]" }
        "quick"      { return "[任务描述]" }
        "workspace"  { return "[可选：add/remove/status/info]" }
        "export"     { return "<change-name> [--to <path>]" }
        default      { return "" }
    }
}

# ── 下载模板 ──

$tempDir = Join-Path $env:TEMP "sillyspec-install"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host ""
Write-Host "SillySpec v$VERSION" -ForegroundColor Magenta
Write-Host "=================="
Write-Host ""
Write-Host " 下载模板..." -ForegroundColor Cyan

foreach ($cmd in $COMMANDS) {
    $url = "$BASE/templates/$cmd.md"
    $out = Join-Path $tempDir "$cmd.md"
    try {
        (New-Object System.Net.WebClient).DownloadFile($url, $out)
    } catch {
        $client = New-Object System.Net.WebClient
        $client.DownloadFile($url, $out)
    }
}
Write-Host "  OK`n" -ForegroundColor Green

# ── 自动检测 ──

$tools = @()
if (Test-Path ".claude")          { $tools += "claude" }
if (Test-Path ".cursor")          { $tools += "cursor" }
if (Test-Path ".opencode")        { $tools += "opencode" }
if (Test-Path ".openclaw")        { $tools += "openclaw" }
$agentsDir = Join-Path $env:USERPROFILE ".agents\skills"
if (Test-Path $agentsDir)         { $tools += "codex" }
if ($tools.Count -eq 0) { $tools = @("claude") }

Write-Host "  安装工具: $($tools -join ', ')"
Write-Host ""

# ── 创建目录 ──

$dirs = @(
    ".sillyspec\codebase", ".sillyspec\changes", ".sillyspec\changes\archive",
    ".sillyspec\plans", ".sillyspec\specs", ".sillyspec\phases",
    (Join-Path $env:USERPROFILE ".sillyspec\templates")
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}

# ── 生成文件 ──

$count = 0

foreach ($t in $tools) {
    Write-Host "  [$t]" -ForegroundColor Yellow

    foreach ($cmd in $COMMANDS) {
        $desc = Get-Desc $cmd
        $argHint = Get-ArgHint $cmd
        $body = Get-Content (Join-Path $tempDir "$cmd.md") -Raw

        switch ($t) {
            "claude" {
                $outDir = ".claude\commands\sillyspec"
                New-Item -ItemType Directory -Path $outDir -Force | Out-Null
                $fm = "---`r`ndescription: $desc`r`nargument-hint: `"$argHint`"`r`n---"
                Set-Content -Path "$outDir\$cmd.md" -Value "$fm`r`n`r`n$body" -Encoding UTF8
            }
            "cursor" {
                $outDir = ".cursor\commands"
                New-Item -ItemType Directory -Path $outDir -Force | Out-Null
                $fm = "---`r`nname: /sillyspec-$cmd`r`nid: sillyspec-$cmd`r`ndescription: $desc`r`n---"
                Set-Content -Path "$outDir\sillyspec-$cmd.md" -Value "$fm`r`n`r`n$body" -Encoding UTF8
            }
            "codex" {
                $outDir = Join-Path $agentsDir "sillyspec-$cmd"
                New-Item -ItemType Directory -Path $outDir -Force | Out-Null
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Set-Content -Path "$outDir\SKILL.md" -Value "$fm`r`n`r`n$body" -Encoding UTF8
            }
            "opencode" {
                $outDir = ".opencode\skills\sillyspec-$cmd"
                New-Item -ItemType Directory -Path $outDir -Force | Out-Null
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Set-Content -Path "$outDir\SKILL.md" -Value "$fm`r`n`r`n$body" -Encoding UTF8
            }
            "openclaw" {
                $outDir = ".openclaw\skills\sillyspec-$cmd"
                New-Item -ItemType Directory -Path $outDir -Force | Out-Null
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Set-Content -Path "$outDir\SKILL.md" -Value "$fm`r`n`r`n$body" -Encoding UTF8
            }
        }
        $count++
    }
    Write-Host "  OK`n" -ForegroundColor Green
}

# ── 清理 ──

Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

# ── 完成 ──

Write-Host "==================="
Write-Host " DONE! $count 个命令已安装" -ForegroundColor Green
Write-Host ""
Write-Host "  已安装工具: $($tools -join ', ')"
Write-Host ""
Write-Host "  入口选择:"
Write-Host "    绿地项目: /sillyspec:init"
Write-Host "    棕地项目: /sillyspec:scan"
Write-Host "    不确定:   /sillyspec:continue"
Write-Host ""
Write-Host "  文档: https://sillyspec.ppdmq.top/"
