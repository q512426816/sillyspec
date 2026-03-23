<#
.SYNOPSIS
    SillySpec v2.3 — Windows 一键安装
.DESCRIPTION
    从 GitHub 下载模板并生成对应 AI 工具的命令文件。
.PARAMETER Workspace
    启用多项目工作区模式
.PARAMETER Tool
    指定安装目标工具（claude/cursor/codex/opencode/openclaw）
.PARAMETER Dir
    指定安装目录（默认当前目录）
.EXAMPLE
    powershell -c "irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex"
    powershell -c "irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex; SillySpec-Install -Workspace"
    powershell -c "irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex; SillySpec-Install -Tool cursor -Workspace"
#>

$ErrorActionPreference = "Stop"

$REPO   = "q512426816/sillyspec"
$BRANCH = "main"
$BASE   = "https://raw.githubusercontent.com/$REPO/$BRANCH"
$VERSION = "2.3"

$COMMANDS = @("init","scan","explore","brainstorm","propose","plan","execute",
              "verify","archive","status","continue","state","resume","quick",
              "workspace","export")

# ── 主安装函数 ──

function Invoke-SillySpecInstall {
    param([switch]$Workspace, [string[]]$Tool, [string]$Dir)

    $UseWorkspace = $Workspace.IsPresent
    $InstallDir = if ($Dir) { $Dir } else { (Get-Location).Path }
    $ToolFilter = if ($Tool) { $Tool } else { @() }

    if ($ToolFilter -contains "help") {
        Write-Host @"
SillySpec v$VERSION 安装脚本

用法:
  SillySpec-Install [-Workspace] [-Tool <tool>] [-Dir <path>]

参数:
  -Workspace   启用多项目工作区模式
  -Tool        指定目标工具: claude, claude_skills, cursor, codex, opencode, openclaw
               可多次指定: -Tool claude -Tool cursor
  -Dir         指定安装目录（默认当前目录）
  -Help        显示帮助

示例:
  SillySpec-Install                      # 自动检测工具，安装到当前目录
  SillySpec-Install -Workspace           # 工作区模式
  SillySpec-Install -Tool cursor         # 只安装 Cursor
  SillySpec-Install -Dir D:\myproject    # 安装到指定目录
  SillySpec-Install -Tool claude -Tool cursor -Workspace
"@
        return
    }

# ── 切换到目标目录 ──

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location $InstallDir

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
        "state"      { return "查看当前工作状态 — 显示 STATE.md 内容" }
        "resume"     { return "恢复工作 — 从 STATE.md 读取进度" }
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
        "state"      { return "" }
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
        Write-Host "  下载失败: $cmd ($url)" -ForegroundColor Red
        Write-Host "  请检查网络连接或稍后重试" -ForegroundColor Yellow
        return
    }
}
Write-Host "  OK`n" -ForegroundColor Green

# ── 写文件（无 BOM UTF-8，避免乱码） ──

function Write-Utf8NoBom($path, $content) {
    $fullPath = Join-Path (Get-Location).Path $path
    $dir = Split-Path $fullPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.UTF8Encoding]::new($false))
}

# ── 确定安装工具 ──

$agentsDir = Join-Path $env:USERPROFILE ".agents\skills"

if ($ToolFilter.Count -gt 0) {
    $tools = $ToolFilter
} else {
    $tools = @()
    if (Test-Path ".claude")          { $tools += "claude" }
    if (Test-Path ".cursor")          { $tools += "cursor" }
    if (Test-Path ".opencode")        { $tools += "opencode" }
    if (Test-Path ".openclaw")        { $tools += "openclaw" }
    if (Test-Path $agentsDir)         { $tools += "codex" }
    if ($tools.Count -eq 0) { $tools = @("claude") }
}

Write-Host "  安装工具: $($tools -join ', ')"
if ($UseWorkspace) { Write-Host "  模式: 工作区" -ForegroundColor Yellow }
Write-Host ""

# ── 创建目录 ──

$dirs = @(
    ".sillyspec\codebase", ".sillyspec\changes", ".sillyspec\changes\archive",
    ".sillyspec\plans", ".sillyspec\specs", ".sillyspec\phases",
    (Join-Path $env:USERPROFILE ".sillyspec\templates")
)

if ($UseWorkspace) {
    $dirs += ".sillyspec\shared"
    $dirs += ".sillyspec\workspace"
}

foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}

# ── 工作区 config.yaml ──

if ($UseWorkspace) {
    $configContent = "# SillySpec 工作区配置`n# 使用 /sillyspec:workspace add 添加子项目`n`nprojects:`n"
    Write-Utf8NoBom ".sillyspec\config.yaml" $configContent
    Write-Host "  已创建工作区配置: .sillyspec\config.yaml" -ForegroundColor Cyan
    Write-Host "  下一步: /sillyspec:workspace add 添加子项目`n" -ForegroundColor Yellow
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
                $fm = "---`r`ndescription: $desc`r`nargument-hint: `"$argHint`"`r`n---"
                Write-Utf8NoBom "$outDir\$cmd.md" "$fm`n`n$body"
            }
            "claude_skills" {
                $outDir = ".claude\skills\sillyspec-$cmd"
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Write-Utf8NoBom "$outDir\SKILL.md" "$fm`n`n$body"
            }
            "cursor" {
                $outDir = ".cursor\commands"
                $fm = "---`r`nname: /sillyspec-$cmd`r`nid: sillyspec-$cmd`r`ndescription: $desc`r`n---"
                Write-Utf8NoBom "$outDir\sillyspec-$cmd.md" "$fm`n`n$body"
            }
            "codex" {
                $outDir = "sillyspec-$cmd"
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Write-Utf8NoBom "$outDir\SKILL.md" "$fm`n`n$body"
            }
            "opencode" {
                $outDir = ".opencode\skills\sillyspec-$cmd"
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Write-Utf8NoBom "$outDir\SKILL.md" "$fm`n`n$body"
            }
            "openclaw" {
                $outDir = ".openclaw\skills\sillyspec-$cmd"
                $fm = "---`r`nname: sillyspec:$cmd`r`ndescription: $desc`r`n---"
                Write-Utf8NoBom "$outDir\SKILL.md" "$fm`n`n$body"
            }
        }
        $count++
    }
    Write-Host "  OK`n" -ForegroundColor Green
}

# ── 全局 skill（仅 claude） ──

if ($tools -contains "claude") {
    $skillContent = "# SillySpec`n全局加载提示。Claude Code 启动时会自动读取此文件。`n输入 /sillyspec: 查看所有可用命令。"
    Write-Utf8NoBom ".claude\skills\sillyspec\SKILL.md" $skillContent
}

# ── 清理 ──

Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

# ── 完成 ──

Write-Host "==================="
Write-Host " DONE! $count 个命令已安装" -ForegroundColor Green
Write-Host "  目录: $InstallDir"
Write-Host ""
Write-Host "  已安装工具: $($tools -join ', ')"
if ($UseWorkspace) { Write-Host "  模式: 工作区（使用 /sillyspec:workspace add 添加子项目）" }
Write-Host ""
Write-Host "  入口选择:"
Write-Host "    绿地项目: /sillyspec:init"
Write-Host "    棕地项目: /sillyspec:scan"
Write-Host "    不确定:   /sillyspec:continue"
Write-Host ""
Write-Host "  文档: https://sillyspec.ppdmq.top/"
Write-Host ""
Write-Host "  带参数重新安装: SillySpec-Install -Workspace"
Write-Host "  帮助: SillySpec-Install -Help"
}

# ── iex 管道：直接安装（无参数） ──
# ── 带参数安装：SillySpec-Install -Workspace -Tool cursor ──

Invoke-SillySpecInstall

# 导出函数供后续带参数调用
function SillySpec-Install {
    Invoke-SillySpecInstall @args
}
