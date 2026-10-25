@echo off
cd /d "%~dp0"
echo Starting Madresehyar site...
start "Madresehyar - SITE (do not close)" cmd /k npm.cmd start
timeout /t 8 >nul
echo Starting Pinggy tunnel...
start "Madresehyar - PINGGY (press Enter if asked for a password, then copy the https address)" cmd /k ssh -p 443 -o ServerAliveInterval=30 -R0:127.0.0.1:3000 free.pinggy.io
echo.
echo Two windows were opened. In the PINGGY window: type yes if asked, press Enter if asked for a password,
echo then copy the https address and open it on your phone. The free tunnel closes after 60 minutes.
pause
