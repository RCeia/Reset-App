@echo off
echo Iniciando o ambiente de forma segura...
docker compose stop frontend
docker compose up -d
echo.
echo Terminal ligado! Pressiona 'r' para dar reload na app.
docker compose attach frontend