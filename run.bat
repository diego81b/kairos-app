@echo off
if "%1"=="dev-up"      ( docker compose -f docker-compose.yml -f docker-compose.dev.yml up ) & exit /b
if "%1"=="dev-up-d"    ( docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d ) & exit /b
if "%1"=="dev-up-b"    ( docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build ) & exit /b
if "%1"=="dev-up-bd"   ( docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d ) & exit /b
if "%1"=="dev-down"    ( docker compose -f docker-compose.yml -f docker-compose.dev.yml down ) & exit /b
if "%1"=="dev-build"   ( docker compose -f docker-compose.yml -f docker-compose.dev.yml build ) & exit /b
if "%1"=="dev-logs"    ( docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f ) & exit /b
if "%1"=="prod-up"   ( docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d ) & exit /b
if "%1"=="prod-down" ( docker compose -f docker-compose.yml -f docker-compose.prod.yml down ) & exit /b
if "%1"=="prod-build"( docker compose -f docker-compose.yml -f docker-compose.prod.yml build ) & exit /b
if "%1"=="prod-logs" ( docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f ) & exit /b
if "%1"=="ps"        ( docker compose ps ) & exit /b
if "%1"=="clean"     ( docker compose down -v --remove-orphans ) & exit /b

echo Uso: run.bat [comando]
echo.
echo  dev-up       dev-up-d    dev-up-b    dev-up-bd    dev-down    dev-build    dev-logs
echo  prod-up      prod-down   prod-build  prod-logs
echo  ps           clean
