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
  ]),
] satisfies RouteConfig;
