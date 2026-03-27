import {
  type RouteConfig,
  index,
  route,
} from '@react-router/dev/routes';

export default [
  index('./app.tsx'),
  route('login', './routes/login.tsx'),
  route('signup', './routes/signup.tsx'),
  route('logout', './routes/logout.tsx'),
  route('og-preview', './routes/og-preview.tsx'),
  route('notes', './routes/notes.tsx', [
    index('./routes/notes._index.tsx'),
    route('graph', './routes/notes.graph.tsx'),
    route('settings', './routes/notes.settings.tsx'),
    route('shortcuts', './routes/notes.shortcuts.tsx'),
    route(':noteId', './routes/notes.$noteId.tsx'),
  ]),
] satisfies RouteConfig;
