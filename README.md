# QuestKeeper

QuestKeeper is a full-stack D&D 5e reference application. The React frontend and Express backend live together in this monorepo so a complete feature can be developed and committed in one place.

## Project structure

```text
QuestKeeper/
|-- questkeeper-frontend/  React and Vite client
|-- questkeeper-backend/   Express API server
|-- package.json           Shared developer commands
`-- README.md
```

Each application keeps its own `package.json` because the browser client and server have different dependencies. The root `package.json` provides shortcuts for working with both applications from the same folder.

## Run locally

Open two terminals in the repository root.

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

The backend listens on `http://localhost:3001`. Vite prints the frontend URL when it starts.

## Useful commands

```bash
npm run build
npm run lint
```

- `build` creates a production frontend build.
- `lint` checks the frontend source with ESLint.

## Repository history

The original frontend and backend Git histories were imported when this monorepo was created. The original GitHub repositories remain unchanged until a new monorepo remote is intentionally configured.
