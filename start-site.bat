@echo off
cd /d "%~dp0"
echo Starting Madresehyar site...
start "Madresehyar - SITE (do not close)" cmd /k npm.cmd start
timeout /t 8 >nul
echo Starting public tunnel...
start "Madresehyar - TUNNEL (copy the https://....trycloudflare.com address)" cmd /k cloudflared tunnel --protocol http2 --url http://localhost:3000
echo.
echo Two windows were opened. Copy the https address from the TUNNEL window and open it on your phone.
pause
