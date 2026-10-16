# Сергей Александрович — event website v2

Motion-first сайт ведущего Сергея Александровича: крупная типографика, живые фото, кинетические появления, horizontal video rail, sticky-карточки и большой анимированный footer-name.

## Стек

- Vite
- GSAP + ScrollTrigger
- Vanilla JavaScript
- Express
- `/api/lead` для заявок

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:4173`

Production:

```bash
npm run build
npm start
```

## Куда приходят заявки

Форма отправляет POST на `/api/lead`. Можно подключить VK, Telegram и CRM/Make/n8n/Bitrix webhook. Все настроенные каналы получают одну заявку.

Скопируйте `.env.example` в `.env`.

### Telegram

```env
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
TELEGRAM_CHAT_ID=123456789
```

### ВКонтакте

Создайте сообщество/бота ВКонтакте и получите токен с доступом к сообщениям. Укажите токен и ID диалога, куда разрешено отправлять заявки:

```env
VK_ACCESS_TOKEN=токен_сообщества_с_доступом_к_сообщениям
VK_PEER_ID=идентификатор_диалога
VK_API_VERSION=5.199
```

Токен храните только на сервере в `.env`, не добавляйте его в клиентский JavaScript и не коммитьте в Git. Для сообщества заранее включите сообщения и проверьте, что токен имеет нужные права.

### CRM / Make / n8n / Bitrix webhook

```env
LEAD_WEBHOOK_URL=https://example.com/your-webhook
```

Сообщение «Заявка отправлена» показывается только после успешного ответа хотя бы одного настроенного backend-канала. Если ни один канал не настроен или доставка не удалась, форма показывает ошибку и предлагает подготовить текст для VK.

## Что добавлено в v2

- загрузочный экран со счётчиком;
- split-letter intro имени Сергея;
- parallax первого экрана;
- magnetic CTA;
- custom cursor на desktop;
- word-by-word scroll reveal;
- sticky stack cards;
- photo parallax scene;
- horizontal pinned video rail на desktop;
- clip-path reveal галереи;
- giant footer-name с посимвольным появлением;
- интерактивный orange orb в footer;
- полноценная форма заявки с backend endpoint;
- honeypot + rate limit для формы;
- fallback в VK при отсутствии настроенного канала заявок.

Фото и видео используются из исходной папки Google Drive.
