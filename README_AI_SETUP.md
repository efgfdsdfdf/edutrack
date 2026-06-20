# ACE Math Solver — AI Backend Setup

This project includes an Express backend (`api/index.js`) that exposes `/api/chat` and `/api/health` endpoints. To keep the AI online for the calculator and math solver, run the backend and set an OpenAI API key.

Quick start (Windows):

1. Install dependencies (run in project root):

```powershell
npm install
```

2. Create a `.env` file in the project root with your OpenAI key:

```text
OPENAI_API_KEY=sk-...
```

3. Start the server:

```powershell
npm run start
```

- Or run in development mode (auto-restarts on change):

```powershell
npm run dev
```

4. Open the frontend pages (e.g., `calculator.html`) in a browser served from the same origin as the backend (recommended) or configure CORS/origin routing. When the backend is reachable, the AI status indicator in the top bar will show "AI online" and queued requests (if any) will be delivered automatically.

Notes
- The backend health endpoint is `/api/health`.
- The frontend queues requests when the AI is offline and retries automatically when the health check passes.
- Do NOT expose your OpenAI API key on public static sites. Keep the backend server private or hosted with secure environment variables.
