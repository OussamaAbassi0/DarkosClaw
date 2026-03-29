"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import {
  Settings,
  X,
  Send,
  Trash2,
  ChevronDown,
  Eye,
  EyeOff,
  Zap,
  Terminal,
  Copy,
  Check,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Provider = "groq" | "openrouter";

interface Config {
  apiKey: string;
  provider: Provider;
  model: string;
}

const PROVIDER_MODELS: Record<Provider, { id: string; label: string }[]> = {
  groq: [
    { id: "llama3-8b-8192", label: "LLaMA 3 8B" },
    { id: "llama3-70b-8192", label: "LLaMA 3 70B" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
  openrouter: [
    { id: "meta-llama/llama-3-8b-instruct:free", label: "LLaMA 3 8B (free)" },
    { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (free)" },
    { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (free)" },
    { id: "qwen/qwen-2-7b-instruct:free", label: "Qwen 2 7B (free)" },
  ],
};

// ─── Settings Modal ──────────────────────────────────────────────────────────

function SettingsModal({
  config,
  onSave,
  onClose,
}: {
  config: Config;
  onSave: (c: Config) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Config>(config);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md glow-border animate-slide-up"
        style={{
          background: "rgba(4, 13, 4, 0.98)",
          border: "1px solid rgba(0,255,65,0.25)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(0,255,65,0.1)" }}
        >
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-phosphor-dim" />
            <span className="text-xs tracking-widest uppercase text-phosphor-dim">
              SYSTEM CONFIG
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-phosphor transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Provider */}
          <div className="space-y-2">
            <label className="text-xs tracking-widest text-terminal-muted uppercase">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["groq", "openrouter"] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() =>
                    setLocal({
                      ...local,
                      provider: p,
                      model: PROVIDER_MODELS[p][0].id,
                    })
                  }
                  className={`py-2 px-3 text-xs tracking-wider uppercase transition-all duration-150 ${
                    local.provider === p
                      ? "bg-phosphor-faint border border-phosphor text-phosphor glow-text-sm"
                      : "border border-phosphor-faint text-terminal-muted hover:border-phosphor hover:text-phosphor"
                  }`}
                >
                  {p === "groq" ? "⚡ GROQ" : "🌐 OPENROUTER"}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-xs tracking-widest text-terminal-muted uppercase">
              Model
            </label>
            <div className="relative">
              <select
                className="input-phosphor w-full px-3 py-2 text-xs appearance-none pr-8"
                value={local.model}
                onChange={(e) => setLocal({ ...local, model: e.target.value })}
                style={{ background: "rgba(0,255,65,0.03)" }}
              >
                {PROVIDER_MODELS[local.provider].map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    style={{ background: "#040d04" }}
                  >
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-muted pointer-events-none"
              />
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-xs tracking-widest text-terminal-muted uppercase">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                className="input-phosphor w-full px-3 py-2 text-xs pr-10"
                placeholder={
                  local.provider === "groq"
                    ? "gsk_..."
                    : "sk-or-..."
                }
                value={local.apiKey}
                onChange={(e) =>
                  setLocal({ ...local, apiKey: e.target.value })
                }
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-phosphor transition-colors"
              >
                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <p className="text-xs text-terminal-muted">
              {local.provider === "groq" ? (
                <>
                  Get free key at{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phosphor-dim hover:text-phosphor underline"
                  >
                    console.groq.com
                  </a>
                </>
              ) : (
                <>
                  Get free key at{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phosphor-dim hover:text-phosphor underline"
                  >
                    openrouter.ai
                  </a>
                </>
              )}
            </p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="btn-phosphor w-full py-2.5 text-xs tracking-widest uppercase flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <Check size={13} className="text-phosphor" />
                SAVED TO LOCALSTORAGE
              </>
            ) : (
              <>
                <Zap size={13} />
                SAVE CONFIG
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  role,
  content,
}: {
  role: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`message-enter flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs font-mono mt-0.5 ${
          isUser
            ? "bg-phosphor-faint border border-phosphor-dim text-phosphor"
            : "bg-void border border-phosphor-faint text-phosphor-dim"
        }`}
        style={{ fontSize: "9px", letterSpacing: "0.1em" }}
      >
        {isUser ? "YOU" : "AI"}
      </div>

      {/* Content */}
      <div
        className={`relative max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-phosphor-faint border border-phosphor-dim text-phosphor"
            : "bg-void-panel border border-void-border text-phosphor-dim"
        }`}
        style={{
          borderRadius: "2px",
          boxShadow: isUser
            ? "0 0 10px rgba(0,255,65,0.1)"
            : "none",
        }}
      >
        <div
          className="message-content text-xs leading-relaxed font-mono whitespace-pre-wrap"
          style={{ letterSpacing: "0.01em" }}
        >
          {content}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-void border border-phosphor-faint p-1 text-terminal-muted hover:text-phosphor"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DarkosClaw() {
  const [config, setConfig] = useState<Config>({
    apiKey: "",
    provider: "groq",
    model: "llama3-8b-8192",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("darkosclaw_config");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
        setHasKey(!!parsed.apiKey);
      } catch {}
    } else {
      // First time — show settings
      setShowSettings(true);
    }
  }, []);

  const handleSaveConfig = (newConfig: Config) => {
    setConfig(newConfig);
    setHasKey(!!newConfig.apiKey);
    localStorage.setItem("darkosclaw_config", JSON.stringify(newConfig));
    setShowSettings(false);
  };

  const { messages, input, setInput, handleSubmit, isLoading, setMessages } =
    useChat({
      api: "/api/chat",
      body: {
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
      },
      onError: (err) => {
        console.error("Chat error:", err);
      },
    });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && hasKey) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const currentModel =
    PROVIDER_MODELS[config.provider]?.find((m) => m.id === config.model)
      ?.label || config.model;

  return (
    <div className="flex flex-col h-screen bg-void grid-bg relative overflow-hidden">
      {/* Scan line effect */}
      <div className="scan-line" />

      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 py-3 z-10"
        style={{
          borderBottom: "1px solid rgba(0,255,65,0.08)",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Terminal size={16} className="text-phosphor" style={{ filter: "drop-shadow(0 0 6px rgba(0,255,65,0.8))" }} />
          </div>
          <div>
            <h1
              className="text-sm font-bold tracking-widest glow-text"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              DARKOSCLAW
            </h1>
            <p className="text-phosphor-faint text-xs tracking-widest" style={{ fontSize: "9px" }}>
              v0.1 // OPEN SOURCE AI AGENT
            </p>
          </div>
        </div>

        {/* Status + Controls */}
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-terminal-muted">
            <div
              className={`w-1.5 h-1.5 rounded-full ${hasKey ? "bg-phosphor animate-pulse-slow" : "bg-red-900"}`}
              style={hasKey ? { boxShadow: "0 0 6px rgba(0,255,65,0.8)" } : {}}
            />
            <span className="text-xs" style={{ fontSize: "10px", letterSpacing: "0.1em" }}>
              {hasKey
                ? `${config.provider.toUpperCase()} // ${currentModel}`
                : "NO KEY SET"}
            </span>
          </div>

          {/* Clear */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-terminal-muted hover:text-phosphor transition-colors p-1.5"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className={`btn-phosphor px-3 py-1.5 text-xs tracking-widest flex items-center gap-1.5 ${!hasKey ? "border-red-800 text-red-500" : ""}`}
          >
            <Settings size={12} />
            <span style={{ fontSize: "10px" }}>CONFIG</span>
          </button>
        </div>
      </header>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
            <div
              className="text-6xl select-none"
              style={{
                filter: "drop-shadow(0 0 20px rgba(0,255,65,0.4))",
                animation: "ambientFlicker 4s infinite",
              }}
            >
              🦅
            </div>
            <div className="space-y-2">
              <h2
                className="text-xl font-bold glow-text tracking-widest"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              >
                DARKOSCLAW TERMINAL
              </h2>
              <p className="text-terminal-muted text-xs tracking-wider max-w-md leading-relaxed">
                OPEN-SOURCE AI AGENT // FREE LLMS // ZERO COST
                <br />
                {hasKey
                  ? `CONNECTED TO ${config.provider.toUpperCase()} — READY FOR INPUT`
                  : "⚠ CONFIGURE YOUR API KEY TO BEGIN"}
              </p>
            </div>

            {!hasKey && (
              <button
                onClick={() => setShowSettings(true)}
                className="btn-phosphor px-5 py-2.5 text-xs tracking-widest flex items-center gap-2"
              >
                <Zap size={13} />
                CONFIGURE API KEY
              </button>
            )}

            {hasKey && (
              <div
                className="grid grid-cols-2 gap-2 max-w-sm w-full"
                style={{ fontSize: "11px" }}
              >
                {[
                  "Explain quantum computing",
                  "Write a Python script",
                  "Debug my code",
                  "Summarize this text",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="text-left px-3 py-2 text-terminal-muted hover:text-phosphor border border-void-border hover:border-phosphor-faint transition-all duration-150 text-xs"
                    style={{ background: "rgba(0,255,65,0.02)" }}
                  >
                    &gt; {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Message list */
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 items-start message-enter">
                <div
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-void border border-phosphor-faint text-phosphor-dim"
                  style={{ fontSize: "9px", letterSpacing: "0.1em" }}
                >
                  AI
                </div>
                <div
                  className="px-4 py-3 bg-void-panel border border-void-border"
                  style={{ borderRadius: "2px" }}
                >
                  <div className="flex items-center gap-1 text-phosphor-dim text-xs">
                    <span>PROCESSING</span>
                    <span className="dot-1">.</span>
                    <span className="dot-2">.</span>
                    <span className="dot-3">.</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input Area ── */}
      <div
        className="flex-shrink-0 p-4 z-10"
        style={{
          borderTop: "1px solid rgba(0,255,65,0.08)",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-4xl mx-auto">
          {/* Prompt symbol */}
          <div
            className="flex-shrink-0 pb-2.5 text-phosphor-dim text-sm font-mono select-none"
            style={{ lineHeight: "1" }}
          >
            &gt;_
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              className="input-phosphor w-full px-3 py-2.5 text-xs resize-none leading-relaxed"
              rows={1}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
                overflow: "auto",
                borderRadius: "2px",
              }}
              placeholder={
                hasKey
                  ? "Enter command... (Shift+Enter for newline)"
                  : "Configure API key in Settings to begin"
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              disabled={!hasKey || isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading || !hasKey}
            className="btn-phosphor px-3 py-2.5 flex items-center gap-1.5 text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            style={{ minWidth: "60px" }}
          >
            <Send size={13} />
            <span style={{ fontSize: "10px" }}>EXEC</span>
          </button>
        </form>

        {/* Bottom meta */}
        <div className="flex items-center justify-between mt-2 max-w-4xl mx-auto">
          <p
            className="text-terminal-muted"
            style={{ fontSize: "9px", letterSpacing: "0.08em" }}
          >
            DARKOSCLAW // KEY STORED IN LOCALSTORAGE // NEVER SENT TO OUR SERVERS
          </p>
          <p
            className="text-phosphor-faint"
            style={{ fontSize: "9px", letterSpacing: "0.08em" }}
          >
            {messages.length > 0 && `${messages.length} MSG`}
          </p>
        </div>
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
