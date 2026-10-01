#!/usr/bin/env bash
# Развёртывание сайта и API в Яндекс Облаке (ru-central1).
# Нужно: yc CLI, авторизованный сервисным аккаунтом (yc config set service-account-key key.json),
# и переменные окружения с секретами:
#   FOLDER_ID, TELEGRAM_BOT_TOKEN, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, CLAIM_KEY
# Необязательно: SITE_URL (адрес сайта, по умолчанию домен API Gateway), YOOKASSA_RECEIPT (по умолчанию 1).
# Скрипт можно запускать повторно: существующие ресурсы переиспользуются, код и сайт обновляются.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${FOLDER_ID:?}" "${TELEGRAM_BOT_TOKEN:?}" "${YOOKASSA_SHOP_ID:?}" "${YOOKASSA_SECRET_KEY:?}" "${CLAIM_KEY:?}"
yc config set folder-id "$FOLDER_ID" >/dev/null
SUFFIX=${FOLDER_ID: -6}
SITE_BUCKET=brilliant-site-$SUFFIX
DATA_BUCKET=brilliant-data-$SUFFIX
SA_NAME=brilliant-api

id_of() { yc "$@" --format json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' 2>/dev/null || true; }

# 1. Сервисный аккаунт функции и шлюза
SA_ID=$(id_of iam service-account get --name $SA_NAME)
[ -n "$SA_ID" ] || SA_ID=$(id_of iam service-account create --name $SA_NAME)
for role in storage.editor functions.functionInvoker; do
  yc resource-manager folder add-access-binding "$FOLDER_ID" --role $role --subject serviceAccount:$SA_ID >/dev/null 2>&1 || true
done

# 2. Бакеты: сайт и данные (оба приватные, сайт отдаётся через API Gateway)
for b in $SITE_BUCKET $DATA_BUCKET; do
  yc storage bucket get --name $b >/dev/null 2>&1 || yc storage bucket create --name $b >/dev/null
done

# 3. Файлы сайта
TMP=$(mktemp -d)
cp index.html privacy.html soglasie.html oferta.html oferta-predstaviteley.html predstavitel.html oplata.html kupit.html spasibo.html "$TMP"/
cp -r assets "$TMP"/
yc storage s3 cp --recursive "$TMP"/ s3://$SITE_BUCKET/ >/dev/null

# 4. Функция API
FN_ID=$(id_of serverless function get --name brilliant-api)
[ -n "$FN_ID" ] || FN_ID=$(id_of serverless function create --name brilliant-api)

# 5. API Gateway (нужен до версии функции, чтобы знать адрес сайта)
SPEC="$TMP/gateway.yaml"
SITE_BUCKET=$SITE_BUCKET SA_ID=$SA_ID FUNCTION_ID=$FN_ID envsubst < yandex/gateway.yaml > "$SPEC"
if yc serverless api-gateway get --name brilliant >/dev/null 2>&1; then
  yc serverless api-gateway update --name brilliant --spec "$SPEC" >/dev/null
else
  yc serverless api-gateway create --name brilliant --spec "$SPEC" >/dev/null
fi
GW_DOMAIN=$(yc serverless api-gateway get --name brilliant --format json | python3 -c 'import sys,json;print(json.load(sys.stdin)["domain"])')
SITE_URL=${SITE_URL:-https://$GW_DOMAIN}

# 6. Код функции: app.mjs + обработчики оплаты из netlify/functions
mkdir -p "$TMP/api"
cp -r yandex/api/* "$TMP/api"/
cp netlify/functions/create-payment.mjs netlify/functions/yookassa-webhook.mjs netlify/functions/submission-created.mjs netlify/functions/claim-course.mjs "$TMP/api"/
(cd "$TMP/api" && zip -qr ../api.zip .)
yc serverless function version create --function-id "$FN_ID" \
  --runtime nodejs22 --entrypoint index.handler --memory 256m --execution-timeout 20s \
  --service-account-id "$SA_ID" --source-path "$TMP/api.zip" \
  --environment "DATA_BUCKET=$DATA_BUCKET,URL=$SITE_URL,TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN,YOOKASSA_SHOP_ID=$YOOKASSA_SHOP_ID,YOOKASSA_SECRET_KEY=$YOOKASSA_SECRET_KEY,YOOKASSA_RECEIPT=${YOOKASSA_RECEIPT:-1},CLAIM_KEY=$CLAIM_KEY" >/dev/null

rm -rf "$TMP"
echo "Сайт:            $SITE_URL"
echo "Уведомления ЮKassa: $SITE_URL/api/yookassa"
echo "Данные (заявки, заказы, оплаты): бакет $DATA_BUCKET"
