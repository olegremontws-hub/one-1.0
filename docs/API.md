# Bath Dream API v2

Серверный MVP клиентского контура. Runtime: **Node.js 22.14+**, хранилище: **SQLite**.

## Запуск

```bash
npm install
npm run server
```

API по умолчанию доступен на `http://localhost:8787`.

Для подключения Vite-клиента:

```bash
cp .env.example .env
npm run dev
```

`.env.example` уже содержит:

```env
VITE_API_URL=http://localhost:8787
```

## Авторизация

В локальном режиме сервер возвращает `devCode`, чтобы OTP-поток можно было тестировать без SMS/e-mail провайдера. При `NODE_ENV=production` код автоматически не показывается.

### Запрос OTP

`POST /api/auth/otp/request`

```json
{
  "method": "phone",
  "contact": "+7 999 123-45-67"
}
```

Поддерживаются `phone` и `email`.

### Проверка OTP

`POST /api/auth/otp/verify`

```json
{
  "requestId": "otp_...",
  "code": "1234"
}
```

Ответ содержит bearer token. Клиент хранит его отдельно от профиля.

### Профиль

`PUT /api/profile` — создать/обновить профиль ФЛ, ИП или Юрлица.

`GET /api/me` — текущий аккаунт.

`POST /api/logout` — отозвать текущую сессию.

## Заказы

Все методы ниже требуют заголовок:

```
Authorization: Bearer <token>
```

- `GET /api/state` — профиль + заказы текущего клиента.
- `PUT /api/state` — синхронизация клиентского состояния.
- `GET /api/orders` — список заказов.
- `POST /api/orders` — создать заказ.
- `GET /api/orders/:number` — получить заказ.
- `PUT /api/orders/:number` — обновить заказ.
- `DELETE /api/orders/:number` — удалить заказ.

## Модель данных

SQLite-схема находится в `server/schema.sql`.

Основные таблицы:

- `auth_accounts` — идентичность и подтверждённые контакты;
- `client_profiles` — профиль ФЛ / ИП / Юрлица;
- `otp_challenges` — одноразовые коды;
- `sessions` — серверные сессии;
- `projects` — объект клиента;
- `orders` — заказ, статус, суммы и расчётный payload.

Клиентский номер заказа хранится как `public_number`. Внутренние идентификаторы имеют отдельные UUID.

## Переменные окружения сервера

- `PORT` — порт, по умолчанию 8787.
- `DB_FILE` — путь к SQLite, по умолчанию `server/bathdream.sqlite`.
- `OTP_TTL_MS` — срок OTP, по умолчанию 5 минут.
- `SESSION_TTL_MS` — срок сессии, по умолчанию 30 дней.
- `OTP_SECRET` — секрет хеширования OTP.
- `SESSION_SECRET` — секрет хеширования токенов.
- `OTP_ECHO=1|0` — принудительно показать/скрыть dev-код.

Для реального публичного запуска потребуется подключить SMS/e-mail delivery provider и задать собственные секреты.
