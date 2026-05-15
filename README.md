# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Local Commands

- `npm run dev` starts the frontend only.
- `npm run dev:backend` starts the Node backend.
- `npm run ai:train` rebuilds the AI model files from MongoDB-backed training data.
- `npm run dev:full` retrains the AI models first, then starts the backend, frontend, and AI prediction server.

To enable the contact form email flow, configure these backend environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `CONTACT_RECEIVER_EMAIL`, `CONTACT_FROM_EMAIL`, and `SMTP_SECURE`.
If you use Gmail, `SMTP_PASS` must be a Google app password, not your normal Gmail password.

To enable Google login, set `GOOGLE_CLIENT_ID` in the backend environment and `VITE_GOOGLE_CLIENT_ID` in the frontend environment to the same Google OAuth client ID.
Google Cloud must also list the exact frontend origin you are using, for example `http://localhost:5173`. If you open the app on `http://127.0.0.1:5173`, add that origin too.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
