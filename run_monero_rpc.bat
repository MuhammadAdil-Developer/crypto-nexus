@echo off
TITLE Monero Wallet RPC Manager
COLOR 0A

cd /d "%~dp0"

echo ===================================================
echo   CRYPTO NEXUS - MONERO WALLET RPC SETUP
echo ===================================================
echo.
echo Current Directory: %CD%
echo.
echo [1/3] Checking for files...

if not exist "monero-wallet-rpc.exe" (
    echo [ERROR] monero-wallet-rpc.exe is MISSING!
    echo Please restore it from your Antivirus/Defender.
    pause
    exit
)

if not exist "monero-wallet-cli.exe" (
    echo [ERROR] monero-wallet-cli.exe is MISSING!
    echo Please restore it from your Antivirus/Defender.
    pause
    exit
)

echo [OK] Files found.
echo.
echo [2/3] Checking Wallet...

if not exist "nexus_wallet" (
    echo [INFO] Creating new wallet 'nexus_wallet'...
    echo.
    monero-wallet-cli.exe --generate-new-wallet nexus_wallet --password testwallet --command exit
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create wallet. Antivirus might have blocked the action.
        pause
        exit
    )
    echo [SUCCESS] Wallet created.
) else (
    echo [INFO] Wallet 'nexus_wallet' already exists. Using it.
)

echo.
echo [3/3] Starting RPC Server...
echo.
echo     - Connecting to: node.community.rino.io:18081 (Mainnet)
echo     - Local RPC Port: 18082
echo.
echo  =======================================================
echo  ||  DO NOT CLOSE THIS WINDOW WHILE WEBSITE IS RUNNING  ||
echo  =======================================================
echo.

monero-wallet-rpc.exe --wallet-file nexus_wallet --password testwallet --rpc-bind-port 18082 --rpc-login monerouser:moneropass123 --daemon-address ravfx.its-a-node.org:18081 --log-level 1 --confirm-external-bind

echo.
echo [ERROR] RPC Server stopped unexpectedly.
pause
