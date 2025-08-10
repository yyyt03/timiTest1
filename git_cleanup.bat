@echo off
echo 开始清理Git仓库，移除测试文件夹...

echo 移除 docs/ 文件夹...
git rm -r --cached docs/ 2>nul
if %errorlevel% neq 0 echo docs/ 文件夹已移除或不存在

echo 移除 json_make/ 文件夹...
git rm -r --cached json_make/ 2>nul
if %errorlevel% neq 0 echo json_make/ 文件夹已移除或不存在

echo 移除 images_backup/ 文件夹...
git rm -r --cached images_backup/ 2>nul
if %errorlevel% neq 0 echo images_backup/ 文件夹已移除或不存在

echo 移除 playground/ 文件夹...
git rm -r --cached playground/ 2>nul
if %errorlevel% neq 0 echo playground/ 文件夹已移除或不存在

echo.
echo 当前Git状态：
git status

echo.
echo 清理完成！现在您可以：
echo 1. 运行 'git add .' 添加所有更改
echo 2. 运行 'git commit -m "移除测试文件夹，准备推送初版"' 提交更改
echo 3. 运行 'git push origin main' 推送到远程仓库

pause 