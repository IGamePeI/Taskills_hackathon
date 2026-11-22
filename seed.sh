#!/bin/sh
set -e

API_URL="http://backend:8090"
COOKIES="/tmp/cookies.txt"

until curl -sf "$API_URL/v1/instructions/" >/dev/null 2>&1; do
  sleep 2
done

COUNT=$(curl -sf "$API_URL/v1/instructions/" | jq 'length')
if [ "$COUNT" -gt 0 ]; then
  exit 0
fi

login() {
  rm -f "$COOKIES"
  sleep 0.3
  curl -sf -c "$COOKIES" -b "$COOKIES" \
    -X POST "$API_URL/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$1\", \"password\": \"$2\"}" >/dev/null
}

post() {
  sleep 0.4
  RES=$(curl -s -w "\n%{http_code}" -c "$COOKIES" -b "$COOKIES" \
    -X POST "$API_URL$1" \
    -H "Content-Type: application/json" \
    -d "$2")
  CODE=$(echo "$RES" | tail -n1)
  BODY=$(echo "$RES" | sed '$d')

  if [ "$CODE" = "401" ]; then
    curl -sf -c "$COOKIES" -b "$COOKIES" -X POST "$API_URL/v1/auth/refresh" >/dev/null
    RES=$(curl -s -w "\n%{http_code}" -c "$COOKIES" -b "$COOKIES" \
      -X POST "$API_URL$1" \
      -H "Content-Type: application/json" \
      -d "$2")
    BODY=$(echo "$RES" | sed '$d')
  fi

  echo "$BODY"
}

curl -s -o /dev/null -X POST "$API_URL/v1/users/" -H "Content-Type: application/json" \
  -d '{"username": "alex_mentor", "email": "author@example.com", "password": "StrongPass123!"}'
sleep 0.3
curl -s -o /dev/null -X POST "$API_URL/v1/users/" -H "Content-Type: application/json" \
  -d '{"username": "ivan_student", "email": "student@example.com", "password": "StrongPass123!"}'

login "author@example.com" "StrongPass123!"

INST1=$(post "/v1/instructions/" '{
  "title": "Настройка Docker с нуля",
  "description": "Пошаговое руководство по запуску проекта",
  "category": "DevOps",
  "tags": "docker,compose",
  "steps": [
    {
      "step_number": 1,
      "title": "Установка Docker",
      "content": "Скачайте и установите Docker.",
      "image_url": "https://logo-teka.com/wp-content/uploads/2026/06/docker-icon-logo.png"
    },
    {
      "step_number": 2,
      "title": "Настройка .env",
      "content": "Заполните переменные окружения."
    }
  ]
}')
INST1_ID=$(echo "$INST1" | jq -r '.id')
STEP1_ID=$(echo "$INST1" | jq -r '.steps[0].id')

STEP3=$(post "/v1/steps/instruction/$INST1_ID" '{
  "step_number": 3,
  "title": "Запуск контейнеров",
  "content": "Выполните docker compose up -d"
}')
STEP3_ID=$(echo "$STEP3" | jq -r '.id')

INST2=$(post "/v1/instructions/" '{
  "title": "Быстрый старт с FastAPI",
  "description": "Создание первого REST API",
  "category": "Backend",
  "tags": "python,fastapi",
  "steps": [
    {"step_number": 1, "title": "Виртуальное окружение", "content": "Выполните python -m venv venv"},
    {"step_number": 2, "title": "Установка пакетов", "content": "Установите fastapi и uvicorn"}
  ]
}')
INST2_ID=$(echo "$INST2" | jq -r '.id')
STEP2_1_ID=$(echo "$INST2" | jq -r '.steps[0].id')

login "student@example.com" "StrongPass123!"

post "/v1/instructions/$INST1_ID/fork" '{}' >/dev/null
post "/v1/progress/" "{\"instruction_id\": $INST1_ID, \"last_completed_step\": 3, \"is_completed\": true}" >/dev/null
post "/v1/progress/" "{\"instruction_id\": $INST2_ID, \"last_completed_step\": 1, \"is_completed\": false}" >/dev/null
post "/v1/feedbacks/" "{\"step_id\": $STEP1_ID, \"is_helpful\": true, \"comment\": \"Всё понятно!\"}" >/dev/null
post "/v1/feedbacks/" "{\"step_id\": $STEP3_ID, \"is_helpful\": true, \"comment\": \"Запустилось с первого раза.\"}" >/dev/null
post "/v1/feedbacks/" "{\"step_id\": $STEP2_1_ID, \"is_helpful\": false, \"comment\": \"Добавьте пример для Windows.\"}" >/dev/null

rm -f "$COOKIES"
