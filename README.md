# Sharp Barber Bangkok

Одностраничный сайт вымышленного барбершопа (demo). Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase.

## Запуск

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
```

## Переменные окружения (`.env.local`)

| Переменная | Где используется |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` (или `SUPABASE_URL`) | только сервер, URL проекта |
| `SUPABASE_SERVICE_ROLE_KEY` | только сервер, **без** префикса `NEXT_PUBLIC_` |
| `TELEGRAM_BOT_TOKEN` | только сервер |
| `TELEGRAM_CHAT_ID` | только сервер |

## База данных

Выполните `supabase/schema.sql` в Supabase → SQL Editor. Скрипт создаёт таблицу `bookings`,
включает RLS без политик и отзывает все права у `anon` и `authenticated`.

## Как устроена запись

```
BookingForm (client) ──POST JSON──▶ /api/booking (Route Handler, Node.js)
                                     1. rate limit по IP (5 запросов / 10 мин)
                                     2. проверка Origin, Content-Type, размера тела
                                     3. honeypot-поле `website` → фиктивный успех
                                     4. validateBooking() — серверная валидация
                                     5. insert через service role (ошибки БД только в логах)
                                     6. Telegram (таймаут 5 с, ошибки не видны клиенту)
```

- `lib/validation.ts` — общие правила для формы и сервера; сервер всегда проверяет заново.
- `lib/server/*` — импортируют `server-only`: сборка упадёт, если такой модуль попадёт в клиентский код.
- Время считается по Бангкоку (UTC+7, без перехода на летнее время).

## Telegram: кнопки Confirm / Cancel

Уведомление о записи приходит с кнопками. Нажатие отправляет `callback_query` на
`POST /api/telegram/webhook`, который:

1. сверяет заголовок `X-Telegram-Bot-Api-Secret-Token` с `TELEGRAM_WEBHOOK_SECRET`;
2. принимает нажатия только из чата `TELEGRAM_CHAT_ID`;
3. проверяет `callback_data` (`confirm:<uuid>` / `cancel:<uuid>`);
4. меняет статус только из `new` (атомарно), иначе отвечает `Already confirmed/cancelled`;
5. убирает кнопки и дописывает в сообщение `✅ Confirmed` или `❌ Cancelled`.

Вебхук ставится один раз на продакшн-домен через `setWebhook` с `secret_token`
и `allowed_updates: ["callback_query"]`, проверяется через `getWebhookInfo`.

## Ограничения

- Rate limit хранится в памяти процесса. На serverless или при нескольких инстансах
  у каждого инстанса свой счётчик; для продакшена лучше Upstash Redis или аналог.
- Пересечения записей к одному мастеру не проверяются: запись приходит со статусом `new`
  и подтверждается вручную.
- Телефон, LINE и соцсети — заглушки в `lib/data.ts`.
