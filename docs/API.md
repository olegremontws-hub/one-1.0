# Bath Dream local API

Локальный API нужен для перехода от браузерного `localStorage` к серверной модели без изменения структуры заказа.

## Запуск

```bash
npm run server
```

По умолчанию: `http://localhost:8787`.

## Методы

- `GET /api/health` — проверка сервера.
- `GET /api/state` — профиль + все заказы.
- `PUT /api/state` — полная синхронизация состояния.
- `GET /api/orders` — список заказов.
- `POST /api/orders` — создать заказ.
- `GET /api/orders/:id` — получить заказ.
- `PUT /api/orders/:id` — обновить заказ.
- `DELETE /api/orders/:id` — удалить заказ.

Данные сохраняются в `server/data.json`. Этот файл предназначен только для локальной MVP-модели и не является production-базой данных.
