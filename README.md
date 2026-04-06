# 🦅 DarkosClaw — Persistent Memory AI Agent

An autonomous AI agent built with Next.js that retains memory across sessions using a JSON-based memory store — enabling context-aware conversations and long-term task tracking.

---

## 🧠 Why DarkosClaw?

Most AI agents are stateless — every session starts from zero. DarkosClaw solves this with a persistent `agent_memory.json` store that accumulates context over time, allowing the agent to:

- Remember past interactions and decisions
- Build on previous context without re-explaining
- Track long-running tasks across multiple sessions

---

## ⚡ Quick Start

### 1. Clone & install

```bash
git clone https://github.com/OussamaAbassi0/DarkosClaw.git
cd DarkosClaw
npm install
```

### 2. Configure environment variables

Create a `.env.local` file:

```env
OPENAI_API_KEY=sk-...
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture

```
User Input
    │
    ▼
Next.js API Route
    ├─→ Read agent_memory.json   ← past context
    ├─→ Build prompt with memory
    ├─→ Call OpenAI / Claude
    └─→ Write updated memory     ← new context saved
            │
            ▼
        Response to user
```

### Memory schema (`agent_memory.json`)

```json
{
  "sessions": [...],
  "tasks": [...],
  "context_summary": "..."
}
```

---

## 🛠️ Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) |
| AI | OpenAI GPT-4o |
| Memory | JSON file store (`agent_memory.json`) |
| Styling | Tailwind CSS |
| Language | TypeScript |

---

## 🗺️ Roadmap

- [ ] Swap JSON store for a vector DB (Pinecone / pgvector)
- [ ] Add memory summarization to prevent context overflow
- [ ] Expose memory management UI (view, edit, reset)
- [ ] Multi-agent support with shared memory

---

## 📄 License

MIT

---

**Built by [Oussama Abassi](https://github.com/OussamaAbassi0)** — AI Automation Architect
