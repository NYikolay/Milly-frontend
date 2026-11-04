# Auth and HTTP Timeout Increase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Увеличить общий bootstrap-бюджет и HTTP-таймаут до 10 000 мс, а ожидание Telegram — до 4 000 мс, не меняя auth-flow и классификацию ошибок.

**Architecture:** Меняются только экспортируемые константы и тесты/документация, которые их фиксируют. `AuthProvider`, `bootstrapAuth` и `requestJson` уже читают эти константы, поэтому логика `min(...)`, дедлайны, retry и `connection-error/network` остаются прежними.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Vitest, axios.

**Spec:** `docs/specs/2026-11-04-auth-timeouts/spec.md`

## Global Constraints

- `AUTH_BOOTSTRAP_BUDGET_MS = 10000` в `app/lib/auth/timeouts.ts`.
- `AUTH_TELEGRAM_INIT_TIMEOUT_MS = 4000` в `app/lib/auth/timeouts.ts`.
- `HTTP_REQUEST_TIMEOUT_MS = 10000` в `app/lib/api/config.ts`.
- `BOOT_WATCHDOG_TIMEOUT_MS = 5000` не менять.
- Поведение не меняется: те же статусы, retry-бюджет, `connection-error/network`, `min(HTTP_REQUEST_TIMEOUT_MS, remainingBudget)`.
- Тесты с произвольными значениями (`3000`, `5000`, `2000`) не переписывать: они проверяют логику, а не дефолты.
- Не добавлять зависимости, переменные окружения, новые таймеры или абстракции.
- Проверки: `npm test`, `npm run typecheck`, `npm run build`.
- Коммитить только файлы этой задачи.

## Review Focus

- Дефолтный per-request таймаут в bootstrap остаётся `min(10000, remainingBudget)`, а не всегда `10000`.
- После ожидания Telegram в 4 секунды на refresh/login остаётся около 6 секунд.
- Runtime-запросы после `authenticated` получают полные 10 секунд.
- Тесты падают, если константы случайно откатят к старым значениям.
- README и AGENTS.md синхронизированы со спекой; исторические спеки не переписаны.

---

### Task 1: Увеличить константы, тесты и актуальную документацию

**Files:**
- Modify: `app/lib/auth/timeouts.ts:1-3`
- Modify: `app/lib/api/config.ts:5`
- Test: `app/lib/auth/timeouts.test.ts`
- Test: `app/lib/api/http.test.ts:127-153`
- Modify: `README.md:99-105`
- Modify: `AGENTS.md:102-106`

**Interfaces:**
- Consumes: существующие импорты `AUTH_BOOTSTRAP_BUDGET_MS`, `AUTH_TELEGRAM_INIT_TIMEOUT_MS`, `HTTP_REQUEST_TIMEOUT_MS` в `auth-provider.tsx`, `bootstrap-auth.ts`, `http.ts`.
- Produces: те же имена экспортов с новыми значениями `10000`, `4000`, `10000`.

- [ ] **Step 1: Написать падающие тесты**

В `app/lib/auth/timeouts.test.ts` добавить импорт констант и блок:

```ts
import {
  AUTH_BOOTSTRAP_BUDGET_MS,
  AUTH_TELEGRAM_INIT_TIMEOUT_MS,
  remainingBudgetMs,
} from "./timeouts";

describe("auth timeout constants", () => {
  it("allows a 10 second bootstrap budget", () => {
    expect(AUTH_BOOTSTRAP_BUDGET_MS).toBe(10000);
  });

  it("waits 4 seconds for Telegram inside the budget", () => {
    expect(AUTH_TELEGRAM_INIT_TIMEOUT_MS).toBe(4000);
  });
});
```

В `app/lib/api/http.test.ts` заменить ожидания `5000` на `10000` в
тестах `uses the default request timeout` и `falls back to the default
timeout for non-positive timeoutMs`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- app/lib/auth/timeouts.test.ts app/lib/api/http.test.ts`
Expected: FAIL на новых ожиданиях `10000` и `4000`, текущие значения —
`5000` и `2000`.

- [ ] **Step 3: Обновить константы**

```ts
export const AUTH_BOOTSTRAP_BUDGET_MS = 10000;

export const AUTH_TELEGRAM_INIT_TIMEOUT_MS = 4000;
```

```ts
export const HTTP_REQUEST_TIMEOUT_MS = 10000;
```

- [ ] **Step 4: Прогнать тесты и проверки**

Run: `npm test -- app/lib/auth/timeouts.test.ts app/lib/api/http.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS, все тесты зелёные.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Обновить README и AGENTS.md**

В `README.md` заменить:

- «5 секунд от mount `AuthProvider` (`AUTH_BOOTSTRAP_BUDGET_MS = 5000`)»
  → «10 секунд … `10000`»;
- «не больше 2 секунд (`AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000`)»
  → «не больше 4 секунд … `4000`»;
- «ограничен 5 секундами (`HTTP_REQUEST_TIMEOUT_MS = 5000`)»
  → «ограничен 10 секундами … `10000`».

В `AGENTS.md` в разделе «Провайдеры, данные и состояние» заменить те же
три значения и сохранить смысл: bootstrap-бюджет 10 000 мс, ожидание
Telegram 4 000 мс, HTTP-таймаут 10 000 мс, во время bootstrap — не
больше остатка бюджета. `BOOT_WATCHDOG_TIMEOUT_MS = 5000` не трогать.

- [ ] **Step 6: Проверить отсутствие старых значений в актуальных docs**

Run: `rg -n "AUTH_BOOTSTRAP_BUDGET_MS = 5000|AUTH_TELEGRAM_INIT_TIMEOUT_MS = 2000|HTTP_REQUEST_TIMEOUT_MS = 5000" README.md AGENTS.md`
Expected: пустой вывод.

- [ ] **Step 7: Коммит**

```bash
git add app/lib/auth/timeouts.ts app/lib/api/config.ts \
  app/lib/auth/timeouts.test.ts app/lib/api/http.test.ts \
  README.md AGENTS.md
git commit -m "feat(auth): increase bootstrap and HTTP timeouts"
```
