# Milly Voice Task Recorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Открыть из карточки «Голосом» переиспользуемую bottom-sheet модалку, записать голос через `MediaRecorder`, показать состояния записи/отмены/mock-отправки и закрыть шторку после успешной отправки.

**Architecture:** `Modal` — низкоуровневый портал с overlay, focus trap, блокировкой скролла, Escape и presence-анимацией. `BottomSheet` — визуальная оболочка снизу с панелью, заголовком, footer и safe-area. Voice-логика живёт в `app/lib/voice/` и `app/hooks/use-voice-recorder.ts`; gesture-кнопка и композиция шторки — отдельные компоненты. Отправка замокана на 1,2 с и позже заменяется API без изменения UI.

**Tech Stack:** React 19, React Router 8 Framework Mode (SSR), TypeScript 5.9 strict, Tailwind CSS 4, Motion 14 (`motion/react`), MediaRecorder + getUserMedia, Telegram Mini App haptics/safe-area.

**Spec:** `docs/specs/2026-11-02-voice-task-recorder/spec.md`

## Global Constraints

- Ширина шторки — viewport минус `15px` с каждой стороны, но не шире `max-w-md` (`28rem`); центрировать. На 412 px панель 382 px.
- Панель: высота `380px`, радиус `25px`, padding `15px`, фон `app-card`. Footer: `50px`, радиус `25px`, gap `10px`.
- Микрофон: внешний круг `156px`, внутренний `116px`, иконка `44×44px`, stroke `2.5px`, белая.
- Порог отмены — `64px`; визуальное смещение микрофона — `min(dy * 0.15, 8px)`; масштаб до `0.97`.
- Пульсация — 3 кольца, цикл `2.1s`, задержки `0 / 700 / 1400ms`, `scale(1) -> 1.34`, opacity `0.32 -> 0`.
- Минимальная запись `300ms`; максимальная `5 * 60_000ms`; mock-загрузка `1200ms`.
- Копирайт строго из `spec.md` §3 FR-4 и §4.1; ошибки — из таблицы §3 FR-4.
- Использовать только `app-*` токены; никаких `dark:`, новых цветов и палитр.
- Никаких новых зависимостей: Motion уже установлен, импорт только из `motion/react`; `framer-motion` не импортировать.
- SSR включён; `window`/`document`/`navigator`/`MediaRecorder` — только в эффектах и обработчиках.
- Все `MediaStreamTrack`, `MediaRecorder`, таймеры, `AbortController` и listeners очищать при отмене, закрытии и unmount.
- TypeScript strict, без `any`; типы — через `import type`; алиас `~/`; файлы kebab-case, компоненты PascalCase.
- Не редактировать `.react-router/types/`.
- Тестового фреймворка и линтера нет; не добавлять `npm test`/`npm run lint`. Автоматические проверки — `npm run typecheck`, `npm run build`, SSR `curl`, ручная проверка.
- Не коммитить: текущая рабочая директория не является git-репозиторием.

## Review Focus

- Разрешение микрофона отклонено, микрофон отсутствует или `MediaRecorder` не поддерживается: модалка показывает ошибку, не зависает в `preparing`, не держит поток открытым.
- Быстрый tap (<300 ms), `pointercancel`, `blur`, скрытие страницы или закрытие шторки во время записи: запись не отправляется, треки остановлены, повторное открытие работает.
- Свайп вниз и возврат выше порога: отмена снимается, цвета возвращаются, отпускание отправляет; порог не срабатывает повторно на каждом pointermove.
- Закрытие во время `sending`: mock-загрузка абортируется, success-haptic не вызывается, нет setState после unmount.
- Повторные открытия/закрытия и несколько записей подряд: нет утечек `MediaStream`, таймеров, `AbortController` и event listener'ов.
- Уход приложения в фон во время записи: запись отменяется, микрофон освобождается.
- `prefers-reduced-motion`: пульсация отключена, transform-анимации не выполняются, текстовый статус остаётся понятным.
- Тёмная тема, 320 px, низкий viewport и safe-area: панель не обрезается, footer видим, тело скроллится, горизонтального скролла нет.
- Focus trap, Escape, возврат фокуса и `aria-live`: фокус не уходит в фон, состояние озвучивается.

---

### Task 1: CSS-пульсация и reduced motion

**Files:**
- Modify: `app/app.css`

**Interfaces:**
- Produces: CSS-класс `.voice-pulse-ring` и keyframes `voice-pulse`, используемые `VoiceRecordButton` из Task 6.

- [ ] **Step 1: Добавить keyframes и класс пульсации**

В `app/app.css` после `.glass-nav`-стилей добавить:

```css
@keyframes voice-pulse {
  0% {
    transform: scale(1);
    opacity: 0.32;
  }
  70% {
    opacity: 0.08;
  }
  100% {
    transform: scale(1.34);
    opacity: 0;
  }
}

.voice-pulse-ring {
  animation: voice-pulse 2.1s cubic-bezier(0.2, 0.65, 0.3, 1) infinite;
  transform-origin: center;
  will-change: transform, opacity;
  pointer-events: none;
}
```

Требования:
- кольцо должно стартовать с размера `116px` и визуально расти до `156px`;
- анимируются только `transform` и `opacity`;
- `will-change` живёт только на кольцах.

- [ ] **Step 2: Отключить пульсацию при reduced motion**

Добавить рядом:

```css
@media (prefers-reduced-motion: reduce) {
  .voice-pulse-ring {
    animation: none;
    opacity: 0;
  }
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`  
Expected: PASS, CSS собирается без ошибок.

---

### Task 2: Переиспользуемый Modal primitive

**Files:**
- Create: `app/components/ui/modal.tsx`

**Interfaces:**
- Consumes: `cn` из `~/lib/cn`; `motion`, `AnimatePresence` из `motion/react`; `createPortal` из `react-dom`.
- Produces:

```ts
export type ModalVariant = "sheet" | "fade";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  variant?: ModalVariant;
}

export function Modal(props: ModalProps): ReactElement | null;
```

- [ ] **Step 1: Реализовать клиентский портал**

Использовать `useState(false)` + `useEffect(() => setMounted(true), [])`. Пока `mounted === false`, возвращать `null`. После монтирования рендерить `createPortal(..., document.body)`.

Требования:
- `AnimatePresence` держать смонтированным;
- overlay и диалог — отдельные direct children с устойчивыми `key`;
- overlay: `fixed inset-0 z-50 bg-black/40`, `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`, transition `{ duration: 0.18, ease: "easeOut" }`;
- диалог: `role="dialog"`, `aria-modal="true"`, `aria-labelledby={labelledBy}`, `aria-describedby={describedBy}`, `tabIndex={-1}`, `outline-none`, `fixed z-50`, `className`/`style` от потребителя;
- `variant="sheet"`: enter `y: 48 -> 0`, opacity `0 -> 1`, spring `stiffness: 380, damping: 34, mass: 0.9`; exit `y: 0 -> 40`, opacity `1 -> 0`, `180ms easeIn`;
- `variant="fade"`: enter/exit opacity + `scale: 0.96 -> 1`, без sheet-сдвига.

- [ ] **Step 2: Добавить focus trap, Escape и восстановление фокуса**

Реализовать:
- `FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'`;
- при открытии сохранять `document.activeElement` в ref;
- фокусировать `initialFocusRef.current ?? dialogRef.current` через `requestAnimationFrame`;
- на `Tab`/`Shift+Tab` зацикливать фокус внутри диалога; если фокус на контейнере или вне диалога — `Tab` ведёт на первый элемент, `Shift+Tab` — на последний; если фокусируемых элементов нет — оставлять фокус на диалоге;
- `Escape` вызывает `onOpenChange(false)` только если модалка — верхняя в стеке и `closeOnEscapeRef.current === true`;
- при cleanup возвращать фокус сохранённому элементу, если он ещё в документе.

- [ ] **Step 3: Добавить стек модалок и блокировку скролла**

Модульные значения:
- `const modalStack: symbol[] = [];`
- `const modalIdRef = useRef(Symbol("modal"));`
- `pushModal(id)`, `removeModal(id)`, `isTopModal(id)`;
- счётчик `scrollLockCount` и сохранённые `document.documentElement.style.overflow` / `document.body.style.overflow`;
- при открытии `lockScroll()`, при cleanup `unlockScroll()`;
- `onOpenChange` и `closeOnEscape` хранить в ref, чтобы смена callback/флага не перезапускала focus/scroll эффект.

Требования:
- эффект открытия (focus/scroll/стек) запускать только после клиентского монтирования; зависимости — `[open, mounted]`;
- `Escape` и focus trap работают только для верхней модалки;
- повторное открытие/закрытие не оставляет `overflow: hidden`;
- в SSR ничего из этого не выполняется.

- [ ] **Step 4: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 3: BottomSheet и действие закрытия

**Files:**
- Create: `app/components/ui/bottom-sheet.tsx`

**Interfaces:**
- Consumes: `Modal` из Task 2; `useId` из React; `cn`.
- Produces:

```ts
export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  panelClassName?: string;
  bodyClassName?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function BottomSheet(props: BottomSheetProps): ReactElement;

export interface BottomSheetActionProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function BottomSheetAction(
  props: BottomSheetActionProps,
): ReactElement;
```

- [ ] **Step 1: Реализовать позиционирование и safe-area**

Использовать `Modal` со следующими настройками:
- `variant="sheet"`;
- `labelledBy={titleId}`;
- `className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col gap-[10px]"`;
- inline style:
  - `paddingLeft: "max(15px, var(--app-inset-left))"`;
  - `paddingRight: "max(15px, var(--app-inset-right))"`;
  - `paddingBottom: "max(15px, var(--app-inset-bottom))"`;
- `titleId` — из `useId()`.

- [ ] **Step 2: Собрать панель и footer**

Разметка:
- панель: `relative flex w-full flex-col overflow-hidden rounded-[25px] bg-app-card p-[15px]`;
- высота `h-[380px]`;
- inline `maxHeight: "calc(var(--tg-viewport-stable-height, 100dvh) - var(--app-inset-top) - var(--app-inset-bottom) - 90px)"`;
- заголовок `<h2 id={titleId}>` с классами `shrink-0 text-center text-[17px] font-semibold leading-[1.4] text-app-text`;
- тело: `flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain` + `bodyClassName`;
- footer: `shrink-0`, рендерить `footer`, если передан.

Требования:
- при нехватке высоты скроллится только тело, заголовок и footer остаются видимыми;
- на 320 px нет горизонтального скролла;
- панель и footer имеют одинаковый `app-card` в обеих темах.

- [ ] **Step 3: Реализовать BottomSheetAction**

Кнопка:
- `type="button"` по умолчанию (разрешить override через props);
- классы: `flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent`;
- пробросить `onClick`, `disabled`, `aria-*` и остальные button-атрибуты.

- [ ] **Step 4: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 4: Контракты, подготовка микрофона и MediaRecorder

**Files:**
- Create: `app/lib/voice/types.ts`
- Create: `app/lib/voice/microphone.ts`
- Create: `app/lib/voice/voice-recorder.ts`

**Interfaces:**
- Produces:

```ts
export type MicrophoneErrorReason =
  | "unsupported"
  | "permission-denied"
  | "no-microphone"
  | "recorder";

export type VoiceRecorderStatus =
  | "idle"
  | "preparing"
  | "recording"
  | "sending"
  | "error";

export type VoiceRecorderError = MicrophoneErrorReason | "upload";

export interface VoiceRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface VoiceRecordingSession {
  stop(): Promise<VoiceRecording>;
  cancel(): void;
}

export type MicrophonePreparation =
  | { ok: true }
  | { ok: false; reason: MicrophoneErrorReason };

export type VoiceRecordingStartResult =
  | { ok: true; session: VoiceRecordingSession }
  | { ok: false; reason: MicrophoneErrorReason };

export const MIN_RECORDING_MS = 300;
export const MAX_RECORDING_MS = 5 * 60_000;
export const MOCK_UPLOAD_DELAY_MS = 1200;

export function isVoiceRecordingSupported(): boolean;
export function prepareMicrophone(): Promise<MicrophonePreparation>;
export function startVoiceRecording(): Promise<VoiceRecordingStartResult>;
```

- [ ] **Step 1: Создать `types.ts`**

Только типы и константы из блока Interfaces. Никаких обращений к DOM на верхнем уровне.

- [ ] **Step 2: Реализовать `microphone.ts`**

`isVoiceRecordingSupported()`:
- `typeof navigator !== "undefined"`;
- `navigator.mediaDevices?.getUserMedia`;
- `typeof MediaRecorder !== "undefined"`.

`prepareMicrophone()`:
- если поддержка отсутствует — `{ ok: false, reason: "unsupported" }`;
- если `navigator.permissions?.query` доступен, запросить `{ name: "microphone" as PermissionName }`:
  - `granted` — `{ ok: true }` без открытия потока;
  - `denied` — `{ ok: false, reason: "permission-denied" }`;
  - `prompt`/ошибка/неизвестно — продолжить;
- вызвать `getUserMedia({ audio: true })`, сразу остановить все треки и вернуть `{ ok: true }`;
- ошибки маппить:
  - `NotAllowedError`, `SecurityError` -> `permission-denied`;
  - `NotFoundError`, `OverconstrainedError` -> `no-microphone`;
  - `NotSupportedError` -> `unsupported`;
  - остальное -> `recorder`.

- [ ] **Step 3: Реализовать `voice-recorder.ts`**

`pickSupportedMimeType()`:
- кандидаты по порядку: `audio/webm;codecs=opus`, `audio/mp4`, `audio/webm`, `audio/ogg;codecs=opus`;
- если `MediaRecorder.isTypeSupported` отсутствует — вернуть `undefined`;
- вернуть первый поддерживаемый или `undefined`.

`startVoiceRecording()`:
- проверить поддержку; при отсутствии вернуть `{ ok: false, reason: "unsupported" }`;
- получить поток `getUserMedia({ audio: true })`;
- создать `MediaRecorder` с выбранным mime (если есть);
- собирать чанки из `dataavailable` с `size > 0`;
- `recorder.start(100)`;
- `stop()` идемпотентен: останавливает recorder (если `state !== "inactive"`), ждёт `stop`, возвращает `{ blob, mimeType, durationMs }`, останавливает треки;
- `cancel()` идемпотентен: останавливает recorder, останавливает треки, отбрасывает blob;
- `durationMs` считать от `Date.now()` до остановки;
- `mimeType` брать из `recorder.mimeType`, затем из выбранного, затем `audio/webm`;
- на `error`/исключение останавливать треки и возвращать/пробрасывать ошибку так, чтобы hook мог поставить `recorder` или `upload` по контексту;
- не обращаться к `navigator`/`MediaRecorder` на верхнем уровне модуля.

- [ ] **Step 4: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 5: Mock-загрузка и state machine `useVoiceRecorder`

**Files:**
- Create: `app/lib/voice/upload-voice-task.ts`
- Create: `app/hooks/use-voice-recorder.ts`

**Interfaces:**
- Consumes: все типы и функции из Task 4.
- Produces:

```ts
export interface UploadVoiceTaskOptions {
  signal?: AbortSignal;
  delayMs?: number;
}

export function uploadVoiceTask(
  recording: VoiceRecording,
  options?: UploadVoiceTaskOptions,
): Promise<void>;

export interface UseVoiceRecorderOptions {
  onSendSuccess?: (recording: VoiceRecording) => void;
  onSendError?: (error: VoiceRecorderError) => void;
}

export interface UseVoiceRecorderResult {
  status: VoiceRecorderStatus;
  error: VoiceRecorderError | null;
  prepare: () => Promise<void>;
  start: () => Promise<void>;
  stopAndSend: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useVoiceRecorder(
  options?: UseVoiceRecorderOptions,
): UseVoiceRecorderResult;
```

- [ ] **Step 1: Реализовать mock-загрузку**

`uploadVoiceTask(recording, { signal, delayMs = MOCK_UPLOAD_DELAY_MS })`:
- `await` промис с `setTimeout(resolve, delayMs)`;
- при `signal.aborted` немедленно reject с `DOMException("Upload aborted", "AbortError")`;
- на `abort` очищать таймер и reject;
- не делать `fetch`, не логировать blob, не использовать `initData`;
- параметр `recording` принимать для будущего API; явно не использовать его тело.

- [ ] **Step 2: Реализовать hook: refs и синхронный статус**

Внутри hook:
- `const [status, setStatus] = useState<VoiceRecorderStatus>("idle")`;
- `const [error, setError] = useState<VoiceRecorderError | null>(null)`;
- `statusRef` и функция `updateStatus(next)`, которая синхронно пишет в `statusRef.current` и вызывает `setStatus(next)` — это защищает от двойного старта до ре-рендера;
- `sessionRef: VoiceRecordingSession | null`;
- `sessionPromiseRef: Promise<VoiceRecordingStartResult> | null`;
- `generationRef`, `mountedRef`, `uploadAbortRef`, `cancelledRef`;
- callbacks `onSendSuccess`/`onSendError` хранить в ref и обновлять каждый рендер.

- [ ] **Step 3: Реализовать `prepare`**

`prepare()`:
- если статус `preparing` — вернуть (защита от Strict Mode double-effect);
- если статус `recording`/`sending` — вернуть;
- увеличить generation;
- `updateStatus("preparing")`, `setError(null)`;
- `await prepareMicrophone()`;
- если generation изменился или компонент размонтирован — выйти;
- `ok` -> `updateStatus("idle")`;
- ошибка -> `setError(reason)`, `updateStatus("error")`.

- [ ] **Step 4: Реализовать `start`, `stopAndSend`, `cancel`, `reset`**

`start()`:
- разрешён только из `idle`;
- generation = текущий;
- `cancelledRef.current = false`;
- `updateStatus("recording")` сразу, чтобы пульсация и инструкция появились мгновенно;
- `sessionPromiseRef.current = startVoiceRecording()`;
- `let result: VoiceRecordingStartResult; try { result = await sessionPromiseRef.current; } catch { setError("recorder"); updateStatus("error"); sessionPromiseRef.current = null; return; }`;
- при `ok: false` -> `setError(reason)`, `updateStatus("error")`, `sessionPromiseRef.current = null`;
- при `ok: true`:
  - если generation изменился или `cancelledRef.current` — `session.cancel()`, очистить `sessionPromiseRef`;
  - иначе сохранить `sessionRef.current`.

`stopAndSend()`:
- разрешён только из `recording`;
- generation = текущий;
- `updateStatus("sending")`;
- `const pending = sessionPromiseRef.current; if (!pending) { updateStatus("idle"); return; }`;
- `let result: VoiceRecordingStartResult; try { result = await pending; } catch { setError("recorder"); updateStatus("error"); sessionPromiseRef.current = null; return; }`;
- если `ok: false` — `setError(reason)`, `updateStatus("error")`, очистить ref;
- если generation изменился — выйти;
- `let recording; try { recording = await session.stop(); } catch { setError("recorder"); updateStatus("error"); return; }`;
- очистить `sessionRef` и `sessionPromiseRef`;
- если generation изменился — выйти;
- если `recording.durationMs < MIN_RECORDING_MS` или `blob.size === 0` -> `updateStatus("idle")`, без отправки;
- создать `AbortController`, сохранить в `uploadAbortRef`;
- `await uploadVoiceTask(recording, { signal })`;
- при успехе вызвать `onSendSuccess(recording)`; статус оставить `sending` (родитель закроет модалку);
- при `AbortError` — молча выйти;
- при другой ошибке — `setError("upload")`, `updateStatus("error")`, `onSendError("upload")`.

`cancel()`:
- увеличить generation;
- `cancelledRef.current = true`;
- абортировать upload;
- отменить `sessionRef.current` / pending session;
- очистить refs;
- `setError(null)`, `updateStatus("idle")`.

`reset()`:
- вызвать `cancel()`;
- `setError(null)`, `updateStatus("idle")`.

- [ ] **Step 5: Добавить таймер максимума и cleanup**

- `useEffect` на `status === "recording"`: `window.setTimeout(() => void stopAndSend(), MAX_RECORDING_MS)`, cleanup очищает таймер.
- `useEffect` на `visibilitychange`: если `document.visibilityState === "hidden"` и статус `recording` — `cancel()`.
- mount-effect: `mountedRef.current = true`; cleanup: `mountedRef.current = false`, увеличить generation, абортировать upload, отменить сессию. Это важно для Strict Mode, где эффект монтируется дважды.
- `useEffect` не должен зависеть от нестабильных объектов; `stopAndSend` сделать `useCallback`.

- [ ] **Step 6: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 6: VoiceRecordButton — жест, пульсация и состояния

**Files:**
- Create: `app/components/voice/mic-icon.tsx`
- Create: `app/components/voice/voice-record-button.tsx`

**Interfaces:**
- Consumes: `VoiceRecorderStatus` из `~/lib/voice/types`; `useMotionValue`, `useSpring`, `useTransform`, `useReducedMotion`, `animate`, `motion` из `motion/react`; `cn`.
- Produces:

```ts
export interface VoiceRecordButtonProps {
  status: VoiceRecorderStatus;
  cancelArmed: boolean;
  disabled?: boolean;
  describedBy?: string;
  onCancelArmedChange: (armed: boolean) => void;
  onPressStart: () => void;
  onPressEnd: (cancelled: boolean) => void;
}

export function VoiceRecordButton(
  props: VoiceRecordButtonProps,
): ReactElement;
```

- [ ] **Step 1: Создать иконку микрофона**

`MicIcon({ className }: { className?: string })`:
- inline `<svg aria-hidden="true" viewBox="0 0 44 44" fill="none">`;
- капсула `rect x=15.5 y=7.5 width=13 height=22 rx=6.5`;
- дуга `M10 21.5a12 12 0 0 0 24 0`;
- ножка `M22 33.5V38`;
- `stroke="currentColor"`, `strokeWidth={2.5}`, `strokeLinecap="round"`;
- размер задаётся через `className` (`size-11`).

- [ ] **Step 2: Реализовать MotionValues и визуал**

Константы:
- `CANCEL_DRAG_THRESHOLD = 64`;
- `MAX_VISUAL_OFFSET = 8`.

Motion:
```ts
const rawY = useMotionValue(0);
const smoothY = useSpring(rawY, { stiffness: 500, damping: 40, mass: 0.6 });
const translateY = useTransform(() =>
  Math.min(smoothY.get() * 0.15, MAX_VISUAL_OFFSET),
);
const dragScale = useTransform(smoothY, [0, CANCEL_DRAG_THRESHOLD], [1, 0.97]);
const pressScale = useMotionValue(1);
const scale = useTransform([dragScale, pressScale], ([drag, press]) =>
  drag * press,
);
const shouldReduceMotion = useReducedMotion();
```

- при `pointerdown`/keyboard start: если `shouldReduceMotion` — не анимировать; иначе `animate(pressScale, 0.97, { duration: 0.12 })`;
- при завершении: если `shouldReduceMotion` — `pressScale.set(1)`; иначе `animate(pressScale, 1, { duration: 0.16 })`; `rawY.set(0)` (spring догонит);
- если `shouldReduceMotion`, в `style` передавать `y: 0`, `scale: 1` вместо MotionValues.

Разметка:
- внешний `div`: `relative flex size-[156px] items-center justify-center rounded-full transition-colors duration-200 select-none`, `style={{ touchAction: "none" }}`;
- внешний фон: `bg-app-accent-soft` для `idle`/`preparing`/`recording`, `bg-app-destructive/10` для `error`/`cancelling`, `bg-app-success/15` для `sending`;
- 3 кольца только при `status === "recording"`: `absolute inset-[20px] rounded-full border-2`, `border-app-accent/40` или `border-app-destructive/40`, класс `voice-pulse-ring`, `aria-hidden`, `style={{ animationDelay: "0ms" | "700ms" | "1400ms" }}`;
- внутренний `motion.button`: `relative z-10 flex size-[116px] touch-none select-none items-center justify-center rounded-full shadow-[0_8px_20px_rgba(0,122,255,0.15)] transition-colors duration-200`, фон `bg-app-accent` / `bg-app-destructive` / `bg-app-success`;
- внутри `MicIcon className="size-11 text-white"`;
- `aria-label` по статусу:
  - `idle` — `Начать запись`;
  - `error` — `Повторить попытку записи`;
  - `recording` + `cancelArmed` — `Отпустите, чтобы отменить запись`;
  - `recording` — `Идёт запись. Отпустите, чтобы отправить`;
  - `preparing` — `Проверка доступа к микрофону`;
  - `sending` — `Отправка голосового сообщения`;
- `aria-disabled` для `preparing`/`sending` и при `disabled`;
- `aria-describedby={describedBy}`;
- `type="button"`;
- `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-accent`.

- [ ] **Step 3: Реализовать pointer-жест**

- `onPointerDown`: только primary button; если `disabled`, `activeRef.current` уже true или статус не `idle`/`recording`/`error` — выйти; сохранить `pointerId`, `startY`, `pressSourceRef.current = "pointer"`; `setPointerCapture`; `activeRef.current = true`; `onPressStart()`;
- `onPointerMove`: если не active, источник не `"pointer"`, pointerId не совпадает или `status !== "recording"` — выйти; `dy = Math.max(0, event.clientY - startY)`; `rawY.set(dy)`; `armed = dy >= CANCEL_DRAG_THRESHOLD`; при изменении `armed` обновить `armedRef` и вызвать `onCancelArmedChange(armed)`; **не** вызывать `setState` на каждое движение;
- `onPointerUp`: если active, источник `"pointer"` и pointerId совпадает — зафиксировать `armedRef.current`, сначала `activeRef.current = false`, затем снять capture (чтобы `lostpointercapture` не вызвал обработку повторно), `onPressEnd(armed)`, `rawY.set(0)`, вернуть `pressScale` к 1;
- `onPointerCancel` и `onLostPointerCapture`: если active и источник `"pointer"` — `activeRef.current = false`, `onPressEnd(true)`, сбросить;
- не запускать запись из `error` здесь: `onPressStart` родителя решает retry.

- [ ] **Step 4: Реализовать клавиатуру**

- `onKeyDown` для `Space`/`Enter`: `preventDefault`; если `event.repeat` или active — игнорировать; иначе `pressSourceRef.current = "keyboard"`, `activeRef.current = true`, `onPressStart()`;
- `onKeyUp` для `Space`/`Enter`: если active и источник `"keyboard"` — `onPressEnd(false)`, сбросить active.
- `onBlur`: если active — `onPressEnd(true)`, сбросить active.
- `Escape` не перехватывать: его обрабатывает `Modal`, закрывая шторку; закрытие отменяет запись через `reset()`.
- При старте с клавиатуры `rawY` не меняется; отмена — через `Escape`/закрытие шторки.

- [ ] **Step 5: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 7: VoiceRecorderSheet — композиция и копирайт

**Files:**
- Create: `app/components/voice/voice-recorder-sheet.tsx`

**Interfaces:**
- Consumes: `BottomSheet`, `BottomSheetAction` из Task 3; `VoiceRecordButton` из Task 6; `useVoiceRecorder` из Task 5; `useTelegram`.
- Produces:

```ts
export interface VoiceRecorderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceRecorderSheet(
  props: VoiceRecorderSheetProps,
): ReactElement;
```

- [ ] **Step 1: Подключить hook, haptics и жизненный цикл**

- `const { haptics } = useTelegram();`
- `const { status, error, prepare, start, stopAndSend, cancel, reset } =
  useVoiceRecorder({ onSendSuccess });`
- `onSendSuccess`: `haptics.notification("success")`, `onOpenChange(false)`.
- `useEffect` на `open`:
  - `open === true` -> `setCancelArmed(false)`, `void prepare()`;
  - `open === false` -> `setCancelArmed(false)`, `reset()`.
- `handleDismiss`: `haptics.selection()`, `reset()`, `onOpenChange(false)`.
- Передавать `onOpenChange={handleDismiss}` в `BottomSheet`, чтобы кнопка, overlay и Escape очищали запись.
- `useEffect` на `status`: при переходе в `error` вызвать `haptics.notification("error")` (покрывает permission/recorder/upload).

- [ ] **Step 2: Реализовать обработчики микрофона**

- `handlePressStart`:
  - `error` -> `void prepare()` (retry), без старта;
  - `idle` -> `haptics.impact("medium")`, `void start()`;
  - иначе — игнорировать.
- `handlePressEnd(cancelled)`:
  - `setCancelArmed(false)`;
  - `cancelled` -> `cancel()`, `haptics.notification("warning")`;
  - иначе -> `void stopAndSend()` (hook сам проверит статус и длительность).
- `handleCancelArmedChange(armed)`:
  - `setCancelArmed(armed)`;
  - `armed` -> `haptics.impact("rigid")`; иначе `haptics.selection()`.
- `useEffect` на `[isActive, status, cancel]` (где `isActive` из `useTelegram()`): если `isActive === false` и `status === "recording"` — `cancel()`.

- [ ] **Step 3: Собрать копирайт состояний**

Функция `getInstruction(status, cancelArmed, error)` возвращает пару `{ title, subtitle, tone }`:

- `idle`/`preparing`: `Зажмите, чтобы записать` / `Отпустите, чтобы отправить` / `secondary`;
- `recording` + `cancelArmed`: `Запись будет отменена` / `Отпустите для отмены` / `destructive`;
- `recording`: `Идёт запись...` / `Проведите вниз для отмены` / `accent`;
- `sending`: `Отправляем...` / `сообщение уже в пути` / `secondary`;
- `error`: таблица:

```ts
const ERROR_COPY: Record<VoiceRecorderError, { title: string; subtitle: string }> = {
  "permission-denied": {
    title: "Нет доступа к микрофону",
    subtitle: "Разрешите доступ в настройках и попробуйте снова",
  },
  unsupported: {
    title: "Запись недоступна",
    subtitle: "Это устройство не поддерживает запись звука",
  },
  "no-microphone": {
    title: "Микрофон не найден",
    subtitle: "Подключите микрофон и попробуйте снова",
  },
  recorder: {
    title: "Не удалось записать",
    subtitle: "Попробуйте ещё раз",
  },
  upload: {
    title: "Не удалось отправить",
    subtitle: "Попробуйте ещё раз",
  },
};
```

- для `error` брать `ERROR_COPY[error ?? "recorder"]`;
- `tone`: `secondary` -> `text-app-text-secondary`, `accent` -> `text-app-accent`, `destructive` -> `text-app-destructive`.

- [ ] **Step 4: Собрать разметку**

Использовать `BottomSheet`:
- `title="Голосовое сообщение"`;
- `describedBy={descriptionId}`;
- `footer={<BottomSheetAction onClick={handleDismiss}>Закрыть</BottomSheetAction>}`;
- `bodyClassName` не задавать, если стандартный body подходит.

Внутри:
- `<p id={descriptionId}>` с текстом `Расскажите какую задачу или трату необходимо записать`, классы `text-center text-[15px] leading-[1.3] text-app-text-secondary`;
- контейнер `flex min-h-0 flex-1 flex-col items-center justify-between gap-5 px-6 py-[15px]`;
- `<VoiceRecordButton status={status} cancelArmed={cancelArmed} disabled={status === "preparing" || status === "sending"} describedBy={instructionId} ... />`;
- блок инструкции: `flex flex-col items-center gap-[5px] text-center`, `id={instructionId}`, `aria-live="polite"`;
  - заголовок `text-[15px] font-semibold leading-[18px] text-app-text`;
  - подзаголовок `text-[13px] leading-[1.4]` + tone-класс.
- `descriptionId` и `instructionId` — из `useId()`.

- [ ] **Step 5: Проверить типы**

Run: `npm run typecheck`  
Expected: PASS.

---

### Task 8: Интеграция с главной и MotionConfig

**Files:**
- Modify: `app/providers/app-providers.tsx`
- Modify: `app/routes/home.tsx`

**Interfaces:**
- Consumes: `VoiceRecorderSheet` из Task 7; `MotionConfig` из `motion/react`; `QuickActionId` из `QuickAccessSection`.
- Produces: карточка «Голосом» открывает шторку; остальные действия не меняются.

- [ ] **Step 1: Добавить MotionConfig**

В `app/providers/app-providers.tsx` импортировать `MotionConfig` из `motion/react` и обернуть дерево:

```tsx
<MotionConfig reducedMotion="user">
  <QueryClientProvider client={queryClient}>
    <TelegramProvider>{children}</TelegramProvider>
  </QueryClientProvider>
</MotionConfig>
```

- [ ] **Step 2: Добавить состояние модалки в home**

В `app/routes/home.tsx`:
- импортировать `useState` из React;
- импортировать `VoiceRecorderSheet` из `~/components/voice/voice-recorder-sheet`;
- добавить `const [isVoiceOpen, setIsVoiceOpen] = useState(false);`;
- заменить `onAction` на:

```tsx
onAction={(id) => {
  haptics.impact("light");

  if (id === "voice") {
    setIsVoiceOpen(true);
  }
}}
```

- отрендерить в конце `<main>`:

```tsx
<VoiceRecorderSheet open={isVoiceOpen} onOpenChange={setIsVoiceOpen} />
```

Требования:
- `VoiceRecorderSheet` рендерится всегда, а не условно, чтобы exit-анимация успевала;
- SSR при `isVoiceOpen === false` не содержит разметку модалки;
- остальные quick actions и FAQ/навигация не меняются.

- [ ] **Step 3: Проверить типы и сборку**

Run: `npm run typecheck`  
Expected: PASS.

Run: `npm run build`  
Expected: PASS.

---

### Task 9: Проверка SSR, браузера, производительности и Telegram

**Files:**
- Verify only; изменений кода нет.

- [ ] **Step 1: Проверить SSR**

Run:
```bash
npm run build
PORT=3000 npm start
curl -s http://localhost:3000/ | grep -E "Задачи на сегодня|Быстрый доступ|Голосовое сообщение"
```

Expected:
- в ответе есть `Задачи на сегодня` и `Быстрый доступ`;
- `Голосовое сообщение` отсутствует, потому что модалка закрыта;
- SSR-ответ не содержит ошибок гидратации в консоли.

- [ ] **Step 2: Проверить открытие/закрытие и состояния в браузере**

Запустить `npm run dev`, открыть `http://localhost:5173`:
- клик «Голосом» -> overlay + шторка, фокус внутри, фон не скроллится;
- `Escape`, клик по overlay и «Закрыть» закрывают шторку; фокус возвращается на ранее активный элемент (обычно карточку «Голосом»);
- зажать микрофон -> пульсация, отпустить -> «Отправляем...» ~1.2 с -> закрытие;
- нажать и отпустить <300 ms -> отправки нет, возврат в `idle`;
- зажать, свайпнуть вниз >=64 px -> красный микрофон, смещение, текст отмены; отпустить -> отмена, шторка открыта;
- свайпнуть вниз, вернуть палец выше порога -> синий микрофон, отпускание отправляет;
- закрыть шторку во время записи -> индикатор микрофона гаснет, повторное открытие работает;
- закрыть во время «Отправляем...» -> модалка закрывается, success-haptic не звучит;
- Tab не выходит за пределы модалки; Space/Enter удерживают запись; Escape во время записи закрывает шторку и отменяет запись.

- [ ] **Step 3: Проверить permission-flow**

В браузере:
- при первом открытии появляется запрос микрофона; после «Разрешить» шторка остаётся в `idle`;
- при «Заблокировать» показывается `Нет доступа к микрофону`; повторное нажатие на микрофон снова запускает подготовку;
- при отключённом микрофоне/неподдерживаемом браузере показывается соответствующая ошибка;
- после отказа и повторного разрешения запись работает без перезагрузки.

- [ ] **Step 4: Проверить темы, размеры и reduced motion**

В DevTools:
- `prefers-color-scheme: dark` и `light`: панель, footer, текст, кольца и микрофон используют `app-*` токены; нет белых/чёрных провалов;
- ширины `320px`, `412px`, `448px`: отступы 15 px, панель не шире `max-w-md`, нет горизонтального скролла, текст не обрезан;
- высота viewport ~568 px: панель уменьшается, тело скроллится, footer видим;
- `prefers-reduced-motion: reduce`: пульсации нет, шторка появляется без transform-сдвига, текстовый статус читается;
- в Performance panel во время записи нет layout/paint-всплесков от pointermove; анимации идут на compositor.

- [ ] **Step 5: Проверить Telegram**

Через HTTPS-туннель на `http://localhost:5173`:
- тема переключается вместе с Telegram;
- нижняя safe-area не перекрывает footer «Закрыть»;
- haptics срабатывают на старте, входе в отмену, отмене, успехе и ошибке;
- разрешение микрофона запрашивается/работает;
- уход в фон во время записи отменяет запись;
- нативный header Telegram не перекрывается и не дублируется.

- [ ] **Step 6: Финальная проверка**

Run:
```bash
npm run typecheck
npm run build
```

Expected: обе команды завершаются успешно.

## Implementation Rulings (applied during execution)

These rulings override the literal earlier task text where noted and match the shipped code:

- **No `preparing` no-op guard in `useVoiceRecorder`.** The plan's guard conflicted with mount-cleanup generation increments under Strict Mode and could strand the sheet in `preparing`. A fresh `prepare` is allowed; the latest generation wins.
- **Every async continuation checks generation + mounted before state or callbacks.** This includes `prepare`, `start`, `stopAndSend`, the `session.stop()` catch, and upload success/error. Closing/cancelling cannot produce a late error or success.
- **All returned hook actions are stable `useCallback` functions**, not just `stopAndSend`, so the sheet's open effect cannot loop.
- **`VoiceRecorderSheet.handlePressEnd(true)` cancels only for `recording` or `idle`.** `preparing`/`sending`/`error` do not cancel, so an error-retry prepare is not aborted; the idle fallback still covers a pointercancel before the recording render.
- **Cancellation uses the pointer-release position**, not the last pointermove: release at or below 64 px sends; at or above cancels.
- **No git commits.** The working directory is not a git repository; verification uses filesystem snapshots and the explicit manual Telegram/hardware checklist in Task 9.
