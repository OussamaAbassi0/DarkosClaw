# DarkosClaw — Persistent Memory AI Agent

An autonomous AI agent built with Next.js that retains memory across sessions using a JSON-based memory store.

## Why

Most AI agents are stateless — every session starts from zero. DarkosClaw persists context in `agent_memory.json`, allowing the agent to remember past interactions, build on previous decisions, and track long-running tasks.

## Quick Start

```bash
git clone https://github.com/OussamaAbassi0/DarkosClaw.git
cd DarkosClaw
npm install
```

Create `.env.local`:

```
OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

## Architecture

```
User Input
    |
Next.js API Route
    |-- Read agent_memory.json   (past context)
    |-- Build prompt with memory
    |-- Call LLM (GPT-4o)
    |-- Write updated memory     (new context saved)
    |
Response to user
```

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **AI:** OpenAI GPT-4o
- **Memory:** Persistent JSON store
- **Styling:** Tailwind CSS

## Roadmap

- [ ] Swap JSON store for pgvector / Pinecone
- [ ] Memory summarization to prevent context overflow
- [ ] Memory management UI (view, edit, reset)
- [ ] Multi-agent shared memory

## License

MIT
