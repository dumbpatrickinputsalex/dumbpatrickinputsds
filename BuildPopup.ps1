# BuildPopup.ps1 - Собирает все модули в один файл для Chrome Extension

Write-Host "🔧 Собираю popup.js из модулей..." -ForegroundColor Yellow

# Создаем выходной файл
$output = @"
// Auto-generated bundle for Chrome Extension
// Generated on $(Get-Date)

"@

# Функция для чтения файла и удаления import/export
function Get-FileContentWithoutImports($filePath) {
    $content = Get-Content $filePath -Raw -Encoding UTF8
    # Удаляем строки import
    $content = $content -replace 'import\s+.*?;', ''
    # Удаляем export class -> class
    $content = $content -replace 'export class', 'class'
    # Удаляем export function -> function
    $content = $content -replace 'export function', 'function'
    # Удаляем export const -> const
    $content = $content -replace 'export const', 'const'
    return $content
}

# 1. Добавляем ChromeStorageRepository
$output += "// === infrastructure/chrome-storage-repository.js ===" + "`n"
$output += (Get-FileContentWithoutImports "infrastructure/chrome-storage-repository.js") + "`n`n"

# 2. Добавляем UrlMatcher
$output += "// === shared/url-matcher.js ===" + "`n"
$output += (Get-FileContentWithoutImports "shared/url-matcher.js") + "`n`n"

# 3. Добавляем лейблы
$output += "// === labels ===" + "`n"
$output += (Get-FileContentWithoutImports "labels/popup-labels.js") + "`n"
$output += (Get-FileContentWithoutImports "labels/common-labels.js") + "`n`n"

# 4. Добавляем панели
$panels = @(
    "popup/fill-panel.js",
    "popup/scraper-panel.js",
    "popup/copyfx-panel.js",
    "popup/investor-panel.js",
    "popup/ua-panel.js"
)

foreach ($panel in $panels) {
    if (Test-Path $panel) {
        $output += "// === $panel ===" + "`n"
        $output += (Get-FileContentWithoutImports $panel) + "`n`n"
    }
}

# 5. Добавляем PopupApp
$output += "// === popup/popup-app.js ===" + "`n"
$output += (Get-FileContentWithoutImports "popup/popup-app.js") + "`n`n"

# 6. Добавляем инициализацию
$output += @"
// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  app.boot();
});
"@

# Сохраняем
Set-Content -Path "popup/popup.js" -Value $output -Encoding UTF8

# Исправляем popup.html
(Get-Content "popup/popup.html") -replace '<script type="module" src="popup-bootstrap.js"></script>', '<script src="popup.js"></script>' | Set-Content "popup/popup.html"

Write-Host "✅ popup.js собран!" -ForegroundColor Green
Write-Host "📋 Перезагрузите расширение в chrome://extensions/" -ForegroundColor Cyan