param(
    [string]$Source = 'C:\Users\haoran\AppData\Roaming\sparkle\profiles\198f3bfb6a9.yaml',
    [string]$Target = 'D:\github\sub\clash.yml'
)

$ErrorActionPreference = 'Stop'

function Get-SectionBlock {
    param(
        [string]$Text,
        [string]$Header,
        [string[]]$NextHeaders
    )

    $headerPattern = [regex]::Escape($Header) + '\r?\n'
    $nextPattern = if ($NextHeaders.Count -gt 0) {
        '(?m)^(?:' + (($NextHeaders | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')'
    } else {
        $null
    }

    $m = [regex]::Match($Text, $headerPattern)
    if (-not $m.Success) {
        throw "Cannot find section header: $Header"
    }

    $start = $m.Index
    $bodyStart = $m.Index + $m.Length
    if ($nextPattern) {
        $n = [regex]::Match($Text.Substring($bodyStart), $nextPattern)
        if ($n.Success) {
            return $Text.Substring($start, $n.Index + $bodyStart - $start)
        }
    }

    return $Text.Substring($start)
}

function Replace-Section {
    param(
        [string]$Text,
        [string]$Header,
        [string]$NewBlock,
        [string[]]$NextHeaders
    )

    $headerPattern = '(?ms)^\s*' + [regex]::Escape($Header) + '\r?\n.*?(?=^\s*(' + (($NextHeaders | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')|\z)'
    if ([regex]::IsMatch($Text, $headerPattern)) {
        return [regex]::Replace($Text, $headerPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $NewBlock }, 1)
    }

    if ($Text -notmatch '(?m)^\s*' + [regex]::Escape($Header) + '\s*$') {
        $append = if ($Text.EndsWith("`r`n")) { "`r`n" } elseif ($Text.EndsWith("`n")) { "`n" } else { "`r`n" }
        return $Text.TrimEnd() + $append + $NewBlock
    }

    return $Text
}

$sourceText = Get-Content -LiteralPath $Source -Raw
$targetText = Get-Content -LiteralPath $Target -Raw

$proxyGroupsBlock = Get-SectionBlock -Text $sourceText -Header 'proxy-groups:' -NextHeaders @('rule-providers:', 'rules:')
$ruleProvidersBlock = Get-SectionBlock -Text $sourceText -Header 'rule-providers:' -NextHeaders @('rules:')
$rulesBlock = Get-SectionBlock -Text $sourceText -Header 'rules:' -NextHeaders @()

$targetText = Replace-Section -Text $targetText -Header 'proxy-groups:' -NewBlock $proxyGroupsBlock -NextHeaders @('rule-providers:', 'rules:')
$targetText = Replace-Section -Text $targetText -Header 'rule-providers:' -NewBlock $ruleProvidersBlock -NextHeaders @('rules:')
$targetText = Replace-Section -Text $targetText -Header 'rules:' -NewBlock $rulesBlock -NextHeaders @()

Set-Content -LiteralPath $Target -Value $targetText -NoNewline

Write-Host "Synced proxy-groups, rule-providers, and rules from $Source to $Target"
