# Сергей Головенькин — event website v2

Motion-first сайт ведущего Сергея Головенькина: крупная типографика, живые фото, кинетические появления, horizontal video rail, sticky-карточки и большой анимированный footer-name.

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

Форма отправляет POST на `/api/lead`. Можно подключить Telegram, CRM/Make/n8n/Bitrix webhook или оба варианта одновременно.

Скопируйте `.env.example` в `.env`.

### Telegram

```env
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
TELEGRAM_CHAT_ID=123456789
```

### CRM / Make / n8n / Bitrix webhook

```env
LEAD_WEBHOOK_URL=https://example.com/your-webhook
```

Если backend-канал пока не настроен, форма не теряет заявку: собирает текст, копирует его и открывает диалог VK Сергея.

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
