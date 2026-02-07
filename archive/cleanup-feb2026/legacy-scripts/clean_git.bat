@echo off
REM Batch script to clean git rebase state
cd /d "d:\SMS\student-management-system"

REM Remove rebase directory
if exist ".git\rebase-merge" (
    rmdir /s /q ".git\rebase-merge"
    echo Removed rebase-merge directory
)

REM Remove rebase files
if exist ".git\REBASE_HEAD" del /f /q ".git\REBASE_HEAD"
if exist ".git\MERGE_MSG" del /f /q ".git\MERGE_MSG"
if exist ".git\AUTO_MERGE" del /f /q ".git\AUTO_MERGE"
if exist ".git\.COMMIT_EDITMSG.swp" del /f /q ".git\.COMMIT_EDITMSG.swp"
if exist ".git\.MERGE_MSG.swp" del /f /q ".git\.MERGE_MSG.swp"

echo Git state cleaned
echo.

REM Now check status
SET GIT_EDITOR=true
git status

echo.
echo Ready to proceed with fixes
pause
