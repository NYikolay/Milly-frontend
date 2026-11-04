# Milly — увеличение auth- и HTTP-таймаутов (SDD Specification)

**Статус:** approved
**Дата:** 2026-11-04
**Область:** `frontend/`
**Связанная спецификация:** `docs/specs/2026-11-03-bootstrap-budget/spec.md`

## 1. Контекст и цель

Текущий bootstrap-бюджет в 5 секунд и ожидание Telegram в 2 секунды
оказались тесными на медленных устройствах и сетях в Telegram. Цель —
дать Telegram больше времени на инициализацию и дать auth-запросам
больше времени на ответ, сохранив общий потолок ожидания в 10 секунд.

Поведение auth-flow не меняется: меняются только длительности.

## 2. Функциональные требования

### FR-1. Временные константы

| Константа | Значение | Модуль | Смысл |
|---|---:|---|---|
| `BOOT_WATCHDOG_TIMEOUT_MS` | `5000` | `app/lib/boot/watchdog.ts` | без изменений |
| `AUTH_BOOTSTRAP_BUDGET_MS` | `10000` | `app/lib/auth/timeouts.ts` | от mount `AuthProvider` до финального auth-статуса |
| `AUTH_TELEGRAM_INIT_TIMEOUT_MS` | `4000` | `app/lib/auth/timeouts.ts` | максимальное ожидание `isAvailable` внутри общего бюджета |
| `HTTP_REQUEST_TIMEOUT_MS` | `10000` | `app/lib/api/config.ts` | таймаут одного HTTP-запроса по умолчанию |

- Пропорция ожидания Telegram к общему бюджету сохраняется: 40%
  (`4000 / 10000`), как и прежде (`2000 / 5000`).
- `BOOT_WATCHDOG_TIMEOUT_MS` остаётся `5000` и не ограничивает auth:
  watchdog снимается до mount `AuthProvider`.
- Новых переменных окружения нет.

### FR-2. Поведение bootstrap

- `AuthProvider` по-прежнему фиксирует
  `deadline = Date.now() + AUTH_BOOTSTRAP_BUDGET_MS` и передаёт в
  `bootstrapAuth` остаток бюджета.
- При `isAvailable === false` ожидание Telegram занимает не больше
  `4000` мс; после него на refresh/login остаётся около `6000` мс.
- Во время bootstrap таймаут каждого запроса остаётся
  `min(HTTP_REQUEST_TIMEOUT_MS, remainingBudget)`, то есть
  `min(10000, remainingBudget)`.
- Исчерпание бюджета или HTTP-таймаут по-прежнему даёт
  `connection-error/network`; новые причины и экраны не добавляются.
- `retry()` по-прежнему запускает новую попытку с полным 10-секундным
  бюджетом.
- Retry-бюджет авторизации (`original → refresh → retry → fallback
  login → final retry`) не меняется.

### FR-3. HTTP-таймаут

- `HTTP_REQUEST_TIMEOUT_MS` равен `10000` и применяется как таймаут
  axios по умолчанию, в том числе для runtime-запросов после
  `authenticated`.
- Во время bootstrap per-request таймаут не превышает остаток общего
  бюджета.
- Ошибка таймаута по-прежнему маппится в `ApiNetworkError` и
  классифицируется как `connection-error/network`.

### FR-4. Документация и тесты

- README и AGENTS.md содержат актуальные значения `10000 / 4000 /
  10000`.
- Тесты фиксируют новые значения констант и дефолтный HTTP-таймаут.
- Тесты с произвольными значениями бюджета (`3000`, `5000`, `2000`)
  остаются без изменений: они проверяют логику `min(...)`, а не
  значения по умолчанию.

## 3. Non-goals

- Не менять auth-flow, retry-бюджет, статусы, экраны и классификацию
  ошибок.
- Не менять `BOOT_WATCHDOG_TIMEOUT_MS`.
- Не добавлять новых зависимостей, таймеров, абстракций или переменных
  окружения.
- Не переписывать исторические спеки и планы за 2026-11-02/03.

## 4. Связь с существующей спецификацией

Эта спецификация заменяет значения `FR-1` из
`docs/specs/2026-11-03-bootstrap-budget/spec.md`:

- `AUTH_BOOTSTRAP_BUDGET_MS`: `5000` → `10000`;
- `AUTH_TELEGRAM_INIT_TIMEOUT_MS`: `2000` → `4000`;
- `HTTP_REQUEST_TIMEOUT_MS`: `5000` → `10000`.

Все остальные требования спецификации 2026-11-03 (общий бюджет,
per-request `min(...)`, `connection-error/network`, generation, retry,
watchdog) остаются в силе.

## 5. Критерии приёмки

- [ ] `AUTH_BOOTSTRAP_BUDGET_MS = 10000`.
- [ ] `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 4000`.
- [ ] `HTTP_REQUEST_TIMEOUT_MS = 10000`.
- [ ] `BOOT_WATCHDOG_TIMEOUT_MS = 5000` не изменён.
- [ ] `npm test` проходит.
- [ ] `npm run typecheck` проходит.
- [ ] `npm run build` проходит.
- [ ] README и AGENTS.md не содержат старых значений для этих трёх
      констант.
