# Bath Dream v0.9 — Public Full-Stack deployment

## Один сервис

Production-модель собирается как один HTTP-сервис:

```
Browser
  |
  +-- /              React SPA
  |
  +-- /api/*         Node API
                         |
                         +-- SQLite /data/bathdream.sqlite
```

Клиент собирается с `VITE_API_URL=same-origin`, поэтому публичный URL нужен только один.

## Docker

Сборка:

```bash
docker build -t bath-dream .
```

Запуск демо-стенда:

```bash
docker run --rm \
  -p 8787:8787 \
  -v bath-dream-data:/data \
  -e OTP_SECRET=change-me-otp \
  -e SESSION_SECRET=change-me-session \
  -e OTP_ECHO=1 \
  bath-dream
```

Открыть:

```
http://localhost:8787
```

Проверка:

```
http://localhost:8787/api/health
```

`OTP_ECHO=1` предназначен только для демонстрационного стенда: код показывается пользователю на экране.

## Render Blueprint

В корне репозитория есть `render.yaml`.

Он создаёт Docker web service в регионе Frankfurt, подключает постоянный диск `/data`, генерирует секреты сессий и запускает публичный демо-OTP.

После подключения репозитория к Render достаточно создать Blueprint из `render.yaml`.

### Важно

Persistent disk нужен для SQLite, иначе данные пропадут при redeploy/restart. Сервис с persistent disk должен работать в одном экземпляре.

## Переход от demo к production

Перед реальным использованием:

1. `OTP_ECHO=0`.
2. Подключить `OTP_WEBHOOK_URL` к SMS/e-mail provider.
3. Не использовать тестовые/демо-контакты как подтверждённые реальные контакты.
4. Настроить собственный домен и HTTPS на hosting provider.
5. Настроить резервное копирование SQLite либо перейти на управляемую SQL-БД.
6. Уточнить и утвердить коммерческие ставки PRICE_BOOK.
7. Утвердить юридические шаблоны документов.
8. Добавить реальный payment provider вместо ручной отметки оплаты.

## CI

CI отдельно проверяет:

- расчётное ядро;
- authenticated SQLite API;
- production OTP webhook;
- versioned pricing;
- обычную Vite-сборку;
- single-service production bundle;
- запуск production HTTP server и раздачу SPA + API.
