# Backend API

Базовый URL:

- Локально (`DOTENV_CONFIG_PATH=apps/backend/.env npm run dev:backend`): `http://localhost:3001`
- Через Docker (`docker compose up`): `http://localhost:3000`

Все роуты подключены с префиксом `/api`.

## Переменные окружения

За основу бери `apps/backend/.env.example`.

Обязательные для реальной генерации:

- `NANOBANANA_API_KEY`
- `NANOBANANA_CALLBACK_URL` (публичный URL)

Поддерживаемые переменные:

- `PORT` по умолчанию `3001`
- `NODE_ENV` по умолчанию `development`
- `CORS_ORIGIN` по умолчанию `*`
- `NANOBANANA_API_KEY` в коде optional, но обязателен для `/api/generate`
- `NANOBANANA_API_BASE_URL` по умолчанию `https://api.nanobananaapi.ai/api/v1/nanobanana`
- `NANOBANANA_CALLBACK_URL` в коде optional, но обязателен для рабочего сценария провайдера

## Локальный запуск

1. Создай env-файл:

```bash
cp apps/backend/.env.example apps/backend/.env
```

2. Заполни минимум:

```env
NANOBANANA_API_KEY=your_key
NANOBANANA_CALLBACK_URL=https://your-public-domain/api/nanobanana/callback
```

3. Запусти backend:

```bash
DOTENV_CONFIG_PATH=apps/backend/.env npm run dev:backend
```

## Запуск через Docker Compose

```bash
docker compose up -d --build backend
```

Backend будет доступен по:

- `http://localhost:3000/api/health`

## Callback через туннель (Cloudflare Quick Tunnel)

Если backend запущен локально, провайдер не сможет достучаться до `localhost`. Нужен публичный URL:

1. Запусти backend на локальном порту `3001`
2. Подними туннель:

Как я делал:

```bash
cloudflared tunnel --url http://localhost:3001
```

3. Скопируй выданный URL, например:

- `https://three-publicly-agency-proc.trycloudflare.com`

4. Пропиши callback URL:

```env
NANOBANANA_CALLBACK_URL=https://three-publicly-agency-proc.trycloudflare.com/api/nanobanana/callback
```

5. Перезапусти backend.

1. Запусти backend:

```bash
DOTENV_CONFIG_PATH=apps/backend/.env npm run dev:backend
```

2. Во втором терминале подними туннель:

```bash
cloudflared tunnel --url http://localhost:3001
```

3. Вставь URL туннеля в `apps/backend/.env`:

```env
NANOBANANA_CALLBACK_URL=https://<random>.trycloudflare.com/api/nanobanana/callback
```

4. Перезапусти backend и отправь запрос:

```bash
curl -s -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "White Sneakers",
    "mode": "compose",
    "productImageUrl": "https://cdn-img.thepoizon.ru/pro-img/cut-img/20240413/93626de2afbf44fda1c1277bfd5d7fce.jpg",
    "waitForResult": true,
    "maxWaitMs": 180000
  }' | jq
```

## API роуты

### `GET /api/health`

Ответ:

```json
{
  "ok": true,
  "service": "backend",
  "ts": "2026-02-15T12:46:58.141Z"
}
```

### `POST /api/generate`

Реальная генерация через NanoBanana.

Тело запроса:

```ts
{
  title: string;
  price?: string;
  features?: string[];
  style?: string;
  mode?: "background" | "compose";
  productImageUrl?: string;
  callbackUrl?: string;
  numImages?: number;
  watermark?: string;
  watermarkText?: string;
  waitForResult?: boolean;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}
```

Ответы:

- `200 OK` (задача принята, если `waitForResult=false`):

```json
{
  "ok": true,
  "state": "queued",
  "taskId": "5aa209dff76d1af78c1170694c0359cf",
  "prompt": "Product: White Sneakers. Create a clean marketplace card with a simple, neutral background."
}
```

- `200 OK` (успех, если `waitForResult=true` и задача завершилась):

```json
{
  "ok": true,
  "state": "completed",
  "taskId": "5aa209dff76d1af78c1170694c0359cf",
  "prompt": "Product: White Sneakers. Compose a clean marketplace card around the provided product photo.",
  "imageUrl": "https://tempfile.aiquickdraw.com/workers/nano/image_1771158326282_plx4ti.png",
  "status": {
    "code": 200,
    "msg": "success",
    "data": {
      "successFlag": 1,
      "errorMessage": null,
      "response": {
        "resultImageUrl": "https://tempfile.aiquickdraw.com/workers/nano/image_1771158326282_plx4ti.png"
      }
    }
  }
}
```

- `202 Accepted` (истекло время ожидания):

```json
{
  "ok": false,
  "state": "timeout",
  "taskId": "5aa209dff76d1af78c1170694c0359cf",
  "error": "Timed out waiting for Nano Banana result",
  "status": {
    "code": 200,
    "msg": "success",
    "data": {
      "successFlag": 0
    }
  }
}
```

- `400 Bad Request` (ошибка валидации):

```json
{
  "ok": false,
  "state": "validation_error",
  "error": "Invalid generate request",
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "title": ["Too small: expected string to have >=1 characters"]
    }
  }
}
```

- `500 Internal Server Error` (ключ не настроен):

```json
{
  "ok": false,
  "state": "config_error",
  "error": "NANOBANANA_API_KEY is not configured"
}
```

- `502 Bad Gateway` (ошибка провайдера / генерация упала):

```json
{
  "ok": false,
  "state": "provider_error",
  "error": "Nano Banana API returned an error",
  "detail": {
    "code": 500,
    "msg": "provider error"
  }
}
```

```json
{
  "ok": false,
  "state": "failed",
  "taskId": "5aa209dff76d1af78c1170694c0359cf",
  "error": "Nano Banana generation failed",
  "status": {
    "code": 200,
    "msg": "success",
    "data": {
      "successFlag": 2,
      "errorMessage": "Generation failed on provider side"
    }
  }
}
```

Пример запроса:

```bash
curl -s -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "White Sneakers",
    "price": "$99",
    "features": ["New drop", "Daily comfort"],
    "style": "marketplace product card, clean premium background, high contrast",
    "mode": "compose",
    "productImageUrl": "https://cdn-img.thepoizon.ru/pro-img/cut-img/20240413/93626de2afbf44fda1c1277bfd5d7fce.jpg",
    "waitForResult": true,
    "maxWaitMs": 180000
  }' | jq
```

### `POST /api/generate/mock`

Mock-роут для тестов фронта без расхода токенов у провайдера.

Тот же запрос, что `/api/generate`, плюс mock-поля:

```ts
{
  mockState?: "completed" | "failed" | "processing";
  mockImageUrl?: string;
  mockErrorMessage?: string;
}
```

Поле `status` возвращается в формате, совместимом с ответом провайдера.

Ответы:

- `200 OK` (`mockState: "completed"`):

```json
{
  "ok": true,
  "state": "completed",
  "taskId": "mock_1739621716824",
  "prompt": "Product: White Sneakers. Compose a clean marketplace card around the provided product photo.",
  "imageUrl": "https://tempfile.aiquickdraw.com/workers/nano/image_mock_1771158326282_plx4ti.png",
  "status": {
    "code": 200,
    "msg": "success",
    "data": {
      "successFlag": 1
    }
  }
}
```

- `502 Bad Gateway` (`mockState: "failed"`):

```json
{
  "ok": false,
  "state": "failed",
  "taskId": "mock_1739621716824",
  "error": "Mock Banana generation failed",
  "status": {
    "code": 200,
    "msg": "success",
    "data": {
      "successFlag": 2,
      "errorCode": "MOCK_FAILED"
    }
  }
}
```

- `202 Accepted` (`mockState: "processing"`):

```json
{
  "ok": false,
  "state": "timeout",
  "taskId": "mock_1739621716824",
  "error": "Timed out waiting for Nano Banana result",
  "status": {
    "code": 200,
    "msg": "success",
    "data": {
      "successFlag": 0
    }
  }
}
```

- `400 Bad Request` (ошибка валидации):

```json
{
  "ok": false,
  "state": "validation_error",
  "error": "Invalid generate mock request",
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "title": ["Too small: expected string to have >=1 characters"]
    }
  }
}
```

Пример:

```bash
curl -s -X POST http://localhost:3001/api/generate/mock \
  -H "Content-Type: application/json" \
  -d '{
    "title": "White Sneakers",
    "mode": "compose",
    "productImageUrl": "https://cdn-img.thepoizon.ru/pro-img/cut-img/20240413/93626de2afbf44fda1c1277bfd5d7fce.jpg",
    "mockState": "completed"
  }' | jq
```

### `POST /api/nanobanana/callback`

Webhook endpoint для callback от провайдера.

Ожидаемый payload:

```ts
{
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    paramJson?: string | null;
    completeTime?: string | null;
    response?: {
      originImageUrl?: string | null;
      resultImageUrl?: string | null;
      status?: string | null;
    } | null;
    successFlag?: number | string | null;
    errorCode?: number | string | null;
    errorMessage?: string | null;
    operationType?: string | null;
    createTime?: string | null;
  };
}
```

Текущее поведение: backend валидирует payload и пишет его в лог.

Ответы:

- `200 OK`:

```json
{
  "ok": true
}
```

- `400 Bad Request`:

```json
{
  "ok": false,
  "errors": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

## TypeScript контракты для фронта

Общие типы лежат в:

- `apps/backend/src/types/generate.ts`
- `apps/backend/src/types/nanobanana.ts`
- общий экспорт: `apps/backend/src/types/index.ts`

Основные типы:

- `GenerateRequest`
- `GenerateResponse`
- `GenerateQueuedResponse`
- `GenerateCompletedResponse`
- `GenerateErrorResponse`
- `NanoBananaRecordInfoResponse`

Состояния `GenerateResponse`:

- успешные: `state = "queued"` или `state = "completed"`
- ошибки: `state = "validation_error" | "config_error" | "provider_error" | "failed" | "timeout"`
