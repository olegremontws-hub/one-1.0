# Bath Dream API v7

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

## Прайс

`GET /api/pricing/active` — публичный активный расчётный прайс. Ответ содержит метаданные версии, ставки работ, правила отходов и логистические коэффициенты.

Клиент фиксирует полученную версию и полный снимок конфигурации в заказе, поэтому историческая смета воспроизводима после публикации нового прайса.

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

## Ход выполнения

Все методы требуют bearer-сессию.

- `GET /api/orders/:number/schedule` — график этапов, агрегированный прогресс и текущая приёмка.
- `POST /api/orders/:number/schedule` — создать базовый график работ.
- `PATCH /api/work-stages/:id` — изменить статус, прогресс, даты или комментарий этапа.
- `POST /api/orders/:number/acceptance` — передать полностью завершённый заказ на приёмку.
- `PATCH /api/acceptance/:id` — принять результат, запросить исправления или отменить приёмку.

Статусы этапа: `planned / in_progress / blocked / done`. После запуска работ заказ автоматически переходит в `work`, после завершения всех этапов — в `acceptance`, после успешной приёмки — в `done`.

## Согласование и аудит

Все методы требуют bearer-сессию.

- `GET /api/orders/:number/history` — версии заказа, аудит и история согласований.
- `POST /api/orders/:number/approvals` — зафиксировать текущую версию заказа на согласование.
- `PATCH /api/approvals/:id` — завершить согласование: `approved`, `rejected` или `cancelled`.

Каждая запись `ORDER_REVISION` хранит неизменяемый снимок расчёта и краткий diff ключевых показателей. `APPROVAL` ссылается на конкретный номер версии и хранит собственный снимок.

## Оплаты

Все методы требуют bearer-сессию.

- `GET /api/orders/:number/payments` — список платежей и агрегаты по заказу.
- `POST /api/orders/:number/payments` — добавить запланированный платёж.
- `PATCH /api/payments/:id` — перевести платёж в `paid` или `cancelled`.

Сервер считает `paid`, `planned`, `remaining` и `unplanned` от текущей суммы заказа и не допускает распределение выше остатка.

## Документы

Все методы требуют bearer-сессию.

- `GET /api/orders/:number/documents` — список документов заказа.
- `POST /api/orders/:number/documents` — создать новую версию документа; body: `{"kind":"quote|contract|act"}`.
- `GET /api/documents/:id` — получить документ и его снимок данных.
- `PATCH /api/documents/:id` — изменить статус; body: `{"status":"draft|issued|signed|cancelled"}`.

Документ хранит снимок данных на момент формирования. Изменение заказа или активного прайса не переписывает уже созданную версию документа.

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
- `OTP_ECHO=1|0` — принудительно показать/скрыть dev-код.\n- `OTP_WEBHOOK_URL` — внешний endpoint доставки OTP.\n- `OTP_WEBHOOK_TOKEN` — необязательный bearer-token для delivery webhook.

При `NODE_ENV=production` `OTP_SECRET` и `SESSION_SECRET` обязательны. Если `OTP_ECHO=0`, сервер требует настроенный `OTP_WEBHOOK_URL`; иначе запрос OTP завершается ошибкой 503 и не создаёт ложного «отправленного» кода.
