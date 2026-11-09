import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/_app.tsx", [
    index("routes/home.tsx"),
    route("tasks", "routes/tasks.tsx"),
    route("tasks/search", "routes/task-search.tsx"),
    route("tasks/:id", "routes/task-detail.tsx"),
    route("tasks/:id/reminders", "routes/task-reminders.tsx"),
    route("tasks/:id/priority", "routes/task-priority.tsx"),
    route("tasks/:id/project", "routes/task-project.tsx"),
    route("tasks/:id/labels", "routes/task-labels.tsx"),
  ]),
] satisfies RouteConfig;
