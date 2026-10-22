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

## Медиа и шрифты

Фото лежат в `public/img`, видео — в `public/video`, шрифты — в `public/fonts`. Всё отдаётся с нашего сервера напрямую (Google Drive и Google Fonts не используются). Видео открываются в модальном окне через нативный `<video>`; Express отдаёт файлы с поддержкой Range-запросов.

Контурное отчество строится в `src/main.js` (`outlineLetters`) из SVG-букв на Montserrat Light, из которого убраны перекрывающиеся контуры, поэтому обводка получается чистой.

## Контент без правки кода: `public/data/content.json`

Файл читается при загрузке страницы, правка вступает в силу после `git pull && npm run build`.

```json
{
  "stats":     [{"value": "10 лет", "label": "на сцене"}],
  "reviews":   [{"type": "wedding|corporate|graduation|jubilee", "name": "Имя", "meta": "Свадьба · июнь 2024", "text": "Текст отзыва"}],
  "venues":    ["Название площадки", "Название компании"],
  "busyDates": ["2026-06-20", "2026-06-27"]
}
```

- `stats` — блок цифр под первым экраном; пустой список — блок скрыт.
- `reviews` — отзывы с фильтром по типу события.
- `venues` — бегущая строка с площадками и компаниями.
- `busyDates` — занятые даты (`ГГГГ-ММ-ДД`): при выборе такой даты в форме показывается подсказка.

## Автодеплой

`.github/workflows/deploy.yml` по пушу в `main` проверяет сборку и по SSH обновляет сервер. Добавьте секреты репозитория `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PATH` (и при необходимости `SSH_PORT`). Для рестарта сервиса пользователю нужен sudo без пароля именно на `systemctl restart sergey-golovenkin.service`.

## Аналитика

Задайте `VITE_YANDEX_METRIKA_ID` в `.env` перед `npm run build` — счётчик подключится автоматически.

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


## Яндекс Метрика (необязательно)

Укажите ID счётчика в переменной `VITE_YANDEX_METRIKA_ID` в `.env` и выполните `npm run build`. Если переменная пуста, скрипт Метрики не загружается. ID счётчика не является секретом; токены VK/Telegram и webhook URL остаются только серверными переменными.

Сайт отправляет цели:
- `lead_submit_success` — сервер подтвердил приём заявки;
- `click_phone` — клик по ссылке телефона;
- `click_vk` — клик по ссылке VK;
- `vk_fallback_open` — форма не смогла автоматически доставить заявку и открывает VK как запасной путь.

Перед включением счётчика проверьте настройки политики обработки персональных данных и согласий для используемой аналитики.
