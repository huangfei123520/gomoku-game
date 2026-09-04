# 灏嗙綉椤垫枃浠跺鍒跺埌 Android assets 鐩綍
 = Resolve-Path ".."
 = "app\src\main\assets"

Write-Host "澶嶅埗缃戦〉鏂囦欢鍒? ..." -ForegroundColor Cyan

New-Item -ItemType Directory -Path "\icons" -Force | Out-Null

@(
    "index.html", "style.css", "game.js", "ai.js",
    "sound.js", "network.js", "app.js",
    "manifest.json", "sw.js"
) | ForEach-Object {
    Copy-Item "\" "\" -Force
    Write-Host "  鉁?" -ForegroundColor Green
}

Copy-Item "\icons\icon-192.png" "\icons\icon-192.png" -Force
Copy-Item "\icons\icon-512.png" "\icons\icon-512.png" -Force
Write-Host "  鉁?icons/icon-192.png" -ForegroundColor Green
Write-Host "  鉁?icons/icon-512.png" -ForegroundColor Green

Write-Host ""
Write-Host "瀹屾垚锛佺幇鍦ㄥ彲浠ョ敤 Android Studio 鎵撳紑 android 鐩綍鏋勫缓 APK銆? -ForegroundColor Cyan