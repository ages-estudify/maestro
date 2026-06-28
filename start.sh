#!/bin/bash

PORTA_BACKEND=3000
PORTA_FRONTEND=8081

DIR_MAESTRO=$(dirname "$(realpath "$0")")
PROJECT_DIR=$(realpath "$DIR_MAESTRO/..")

# Redireciona arquivos de erro/crash da JVM (usada pelo Maestro) para a pasta logs
mkdir -p "$DIR_MAESTRO/logs"
export JAVA_TOOL_OPTIONS="-XX:ErrorFile=$DIR_MAESTRO/logs/hs_err_pid%p.log"

DIR_BACKEND="$PROJECT_DIR/backend"
DIR_FRONTEND="$PROJECT_DIR/frontend-mobile"

cleanup() {
    echo -e "\n[Encerrando] Parando todos os serviços..."
    pkill -f "nest start"
    pkill -f "expo run:android"
    pkill -f "expo start"
    pkill -f "MaestroStudio.AppImage"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

if ! adb devices | grep -v "List" | grep -q "device"; then
    echo "[Erro] Nenhum dispositivo conectado. Conecte o telefone e ative a depuração USB."
    exit 1
fi
echo "[Dispositivo] Aparelho conectado."

echo "[ADB] Redirecionando porta $PORTA_BACKEND..."
adb reverse tcp:$PORTA_BACKEND tcp:$PORTA_BACKEND

if ! ss -tuln | grep -q ":$PORTA_BACKEND"; then
    echo "[Backend] Iniciando NestJS/Banco..."
    gnome-terminal --title="Backend NestJS" --working-directory="$DIR_BACKEND" -- bash -c "npm install && docker compose up -d && npx prisma migrate reset --force && npx prisma generate && npm run db:seed && npx nest start --watch || exec bash"
else
    echo "[Backend] NestJS/Banco já estão rodando."
fi

if ! ss -tuln | grep -q ":$PORTA_FRONTEND"; then
    echo "[Frontend] Compilando e iniciando Expo..."
    gnome-terminal --title="Frontend Expo Build" --working-directory="$DIR_FRONTEND" -- bash -c "npm i && npx expo run:android || exec bash"
else
    echo "[Frontend] Expo já está rodando."
fi

if ! pgrep -f "MaestroStudio" > /dev/null; then
    echo "[Maestro] Iniciando Maestro Studio..."
    gnome-terminal --title="Maestro Studio" --working-directory="$DIR_MAESTRO" -- bash -c "npm i && npm run studio || exec bash"
else
    echo "[Maestro] Maestro Studio já está rodando."
fi

echo "============================================================="
echo "Serviços iniciados em novas janelas."
echo "MANTENHA ESTE TERMINAL ABERTO."
echo "Pressione Ctrl+C aqui para encerrar tudo e fechar as janelas."
echo "============================================================="

while true; do
    sleep 1
done