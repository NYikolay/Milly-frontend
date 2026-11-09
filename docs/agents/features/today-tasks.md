# Экран «Задачи на сегодня» (`/tasks`)

- `/tasks` использует `GET /tasks?date=<today>&status=all&limit=100`,
  `GET /tasks/today/progress`, `POST /tasks/{id}/complete`,
  `POST /tasks/{id}/uncomplete`; данные загружаются React Query после
  `AuthGate`, не в loader. Нижние вкладки «Главная»/«Задачи» навигируют
  на `/` и `/tasks`. Кнопка добавления задачи закреплена над нижней
  навигацией справа (fixed, как navbar) и ведёт на `/` к быстрому
  созданию; блоков «Голосом»/«Интерактивно» на `/tasks` больше нет.
