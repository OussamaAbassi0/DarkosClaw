"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Settings, X, Send, Trash2, ChevronDown,
  Eye, EyeOff, Zap, Copy, Check,
  Globe, Search, ExternalLink, MessageSquare,
  ListTodo, Brain, ChevronRight, Link2,
  Sparkles, Command, PanelLeftClose, PanelLeft,
  Plus, Cpu,
} from "lucide-react";

// ─── Palette (logo colors) ────────────────────────────────────────────────────
const C = {
  accent:     "#00d4ff",
  accent2:    "#38bdf8",
  accent3:    "#0ea5e9",
  accentDim:  "rgba(0,212,255,0.1)",
  accentGlow: "rgba(0,212,255,0.35)",
  bg:         "#060d1a",
  bgCard:     "#0d1f35",
  bgInput:    "#0f2440",
  border:     "rgba(0,212,255,0.08)",
  borderHov:  "rgba(0,212,255,0.18)",
  text1:      "#e2f0ff",
  text2:      "#7a9ab8",
  text3:      "#3a5570",
  silver:     "#94a3b8",
  green:      "#22c55e",
  warn:       "#f59e0b",
  danger:     "#ef4444",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Provider = "groq" | "openrouter";
interface Config { apiKey: string; provider: Provider; model: string; }
interface SearchResult { title: string; url: string; content: string; }
interface WebSearchResult   { query: string; results: SearchResult[]; error?: string; }
interface ReadWebsiteResult { url: string; content: string; error?: string; }
interface MemoryResult      { memories?: string[]; message?: string; success?: boolean; total?: number; error?: string; }

const PROVIDER_MODELS: Record<Provider, { id: string; label: string; badge?: string }[]> = {
  groq: [
    { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B", badge: "Fast"    },
    { id: "llama-3.1-8b-instant",    label: "LLaMA 3.1 8B",  badge: "Instant" },
    { id: "mixtral-8x7b-32768",      label: "Mixtral 8x7B",  badge: "Code"    },
  ],
  openrouter: [
    { id: "meta-llama/llama-3-8b-instruct:free", label: "LLaMA 3 8B"  },
    { id: "google/gemma-2-9b-it:free",           label: "Gemma 2 9B"  },
    { id: "mistralai/mistral-7b-instruct:free",  label: "Mistral 7B"  },
    { id: "qwen/qwen-2-7b-instruct:free",        label: "Qwen 2 7B"   },
  ],
};

const TOOL_CONFIG = {
  webSearch:    { sym: "◈", label: "Web Search",      labelDone: "Search complete",  color: C.accent,  bg: "rgba(0,212,255,0.07)",   border: "rgba(0,212,255,0.18)"   },
  readWebsite:  { sym: "⟁", label: "Reading page",    labelDone: "Page read",        color: "#a78bfa", bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.18)" },
  analyzeImage: { sym: "◉", label: "Analyzing image", labelDone: "Image analyzed",   color: C.warn,    bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)"  },
  manageMemory: { sym: "▣", label: "Memory access",   labelDone: "Memory updated",   color: "#2dd4bf", bg: "rgba(45,212,191,0.07)",  border: "rgba(45,212,191,0.18)"  },
  getCryptoPrice:     { sym: "◆", label: "Crypto price",    labelDone: "Price fetched",    color: C.accent2, bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.18)"  },
  getWeather:         { sym: "⬡", label: "Weather",         labelDone: "Weather fetched",  color: "#60a5fa", bg: "rgba(96,165,250,0.07)",  border: "rgba(96,165,250,0.18)"  },
  convertCurrency:    { sym: "▸", label: "Currency",        labelDone: "Converted",        color: "#34d399", bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.18)"  },
  getCountryInfo:     { sym: "⬟", label: "Country info",    labelDone: "Data fetched",     color: C.accent2, bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.18)"  },
  getProgrammingJoke: { sym: "◉", label: "Loading joke",    labelDone: "Joke ready",       color: "#f472b6", bg: "rgba(244,114,182,0.07)", border: "rgba(244,114,182,0.18)" },
  getGithubProfile:   { sym: "⌬", label: "GitHub profile",  labelDone: "Profile fetched",  color: C.silver,  bg: "rgba(148,163,184,0.07)", border: "rgba(148,163,184,0.18)" },
  guessAgeFromName:   { sym: "⌖", label: "Guessing age",    labelDone: "Age estimated",    color: "#fb923c", bg: "rgba(251,146,60,0.07)",  border: "rgba(251,146,60,0.18)"  },
  getTvShowInfo:      { sym: "▸", label: "TV show lookup",  labelDone: "Show found",       color: "#e879f9", bg: "rgba(232,121,249,0.07)", border: "rgba(232,121,249,0.18)" },
  getPeopleInSpace:   { sym: "⬡", label: "Space station",   labelDone: "Data received",    color: C.accent,  bg: "rgba(0,212,255,0.07)",   border: "rgba(0,212,255,0.18)"   },
  getRandomFact:      { sym: "◈", label: "Random fact",     labelDone: "Fact loaded",      color: "#a3e635", bg: "rgba(163,230,53,0.07)",  border: "rgba(163,230,53,0.18)"  },
  scrapeWebsite:      { sym: "⟁", label: "Scraping page",   labelDone: "Content scraped",  color: "#a78bfa", bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.18)" },
  executePythonCode:  { sym: "▣", label: "Executing code",  labelDone: "Execution done",   color: "#4ade80", bg: "rgba(74,222,128,0.07)",  border: "rgba(74,222,128,0.18)"  },
  generateImage:      { sym: "◆", label: "Generating image",labelDone: "Image created",    color: "#f472b6", bg: "rgba(244,114,182,0.07)", border: "rgba(244,114,182,0.18)" },
  scanNetwork:        { sym: "⌬", label: "Network scan",    labelDone: "Scan complete",    color: C.danger,  bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)"   },
  sendHttpRequest:    { sym: "▸", label: "HTTP request",    labelDone: "Response received",color: C.accent,  bg: "rgba(0,212,255,0.07)",   border: "rgba(0,212,255,0.18)"   },
  manageTempEmail:    { sym: "◈", label: "Temp email",      labelDone: "Email ready",      color: "#fb923c", bg: "rgba(251,146,60,0.07)",  border: "rgba(251,146,60,0.18)"  },
  getUnlimitedAiResponse: { sym: "⌖", label: "Free AI",    labelDone: "Response received",color: C.accent2, bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.18)"  },
  getWaybackSnapshot: { sym: "⬟", label: "Time Machine",   labelDone: "Archive found",    color: "#a78bfa", bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.18)" },
  transcribeAudio:    { sym: "◉", label: "Transcribing",   labelDone: "Transcription done",color: "#2dd4bf", bg: "rgba(45,212,191,0.07)",  border: "rgba(45,212,191,0.18)"  },
};

// ─── Claw Logo SVG ────────────────────────────────────────────────────────────
function Logo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 select-none flex items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: size * 0.22,
        background: "linear-gradient(135deg, #0a1628 0%, #0d2040 100%)",
        border: "1px solid rgba(0,212,255,0.35)",
        boxShadow: `0 0 ${size * 0.4}px rgba(0,212,255,0.3), inset 0 1px 0 rgba(0,212,255,0.1)`,
        flexShrink: 0,
      }}
    >
      <Cpu size={size * 0.5} style={{ color: C.accent, filter: `drop-shadow(0 0 ${size * 0.1}px rgba(0,212,255,0.8))` }} />
    </div>
  );
}

function AIAvatar({ size = 34 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: size * 0.3,
        background: "linear-gradient(135deg, #061428 0%, #0a1e38 100%)",
        border: "1px solid rgba(0,212,255,0.3)",
        boxShadow: "0 0 12px rgba(0,212,255,0.2)",
        flexShrink: 0,
      }}
    >
      <Cpu size={size * 0.48} style={{ color: C.accent, filter: "drop-shadow(0 0 4px rgba(0,212,255,0.8))" }} />
    </div>
  );
}

function UserAvatar({ size = 34 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-semibold"
      style={{
        width: size, height: size,
        borderRadius: size * 0.3,
        background: "linear-gradient(135deg, #1a2a3a 0%, #0f1e2e 100%)",
        border: `1px solid rgba(148,163,184,0.2)`,
        color: C.silver,
        fontSize: size * 0.34,
        flexShrink: 0,
      }}
    >
      U
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyBtn({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const s = size === "xs" ? 10 : 12;
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 rounded-md transition-all duration-150"
      style={{
        padding: size === "xs" ? "3px 7px" : "4px 9px",
        background: copied ? "rgba(34,197,94,0.12)" : "rgba(0,212,255,0.05)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(0,212,255,0.12)"}`,
        color: copied ? C.green : C.text3,
        fontSize: size === "xs" ? "10px" : "11px",
      }}
    >
      {copied ? <Check size={s} /> : <Copy size={s} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="md-prose"
      components={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code({ className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const raw = String(children);
          const isInline = !raw.includes("\n");
          const isTerminal = !match && !isInline;

          if (isInline) {
            return (
              <code style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: "rgba(0,212,255,0.08)",
                color: C.accent,
                padding: "2px 6px", borderRadius: "4px", fontSize: "0.8em",
                border: "1px solid rgba(0,212,255,0.15)",
              }} {...props}>{children}</code>
            );
          }

          // Terminal block — cyberpunk style
          if (isTerminal) {
            return (
              <div className="my-3 overflow-hidden" style={{ borderRadius: "6px", border: "1px solid rgba(0,212,255,0.2)", background: "rgba(4,10,20,0.95)" }}>
                <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(0,212,255,0.05)", borderBottom: "1px solid rgba(0,212,255,0.12)" }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(0,212,255,0.5)", boxShadow: "0 0 4px rgba(0,212,255,0.8)" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(0,212,255,0.25)" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(0,212,255,0.1)" }} />
                  </div>
                  <span style={{ color: "rgba(0,212,255,0.4)", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em" }}>DARKOSCLAW_OS</span>
                  <CopyBtn text={raw.replace(/\n$/, "")} size="xs" />
                </div>
                <pre style={{ margin: 0, padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", lineHeight: "1.7", color: C.accent, whiteSpace: "pre", overflowX: "auto", textShadow: "0 0 8px rgba(0,212,255,0.4)" }}>
                  {raw.replace(/\n$/, "")}
                </pre>
              </div>
            );
          }

          return (
            <div className="my-3 overflow-hidden" style={{ borderRadius: "8px", border: "1px solid rgba(0,212,255,0.1)", background: "#050e1c" }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "rgba(0,212,255,0.03)", borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,212,255,0.4)" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,212,255,0.2)" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,212,255,0.1)" }} />
                  </div>
                  <span style={{ color: "rgba(0,212,255,0.4)", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>{match?.[1]}</span>
                </div>
                <CopyBtn text={raw.replace(/\n$/, "")} size="xs" />
              </div>
              <SyntaxHighlighter style={vscDarkPlus} language={match?.[1] ?? "text"} PreTag="div"
                customStyle={{ margin: 0, padding: "16px", background: "transparent", fontSize: "0.8rem", lineHeight: "1.65" }}>
                {raw.replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          );
        },

        h1({ children }) {
          return (
            <div className="my-4" style={{ borderBottom: `2px solid rgba(0,212,255,0.3)`, paddingBottom: "10px" }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: C.text1, letterSpacing: "-0.03em", lineHeight: 1.2, textShadow: "0 0 20px rgba(0,212,255,0.2)" }}>{children}</h1>
            </div>
          );
        },
        h2({ children }) {
          return (
            <div className="my-3" style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: "12px", marginTop: "20px" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: C.text1, letterSpacing: "-0.01em" }}>{children}</h2>
            </div>
          );
        },
        h3({ children }) {
          return (
            <h3 className="my-2" style={{ fontSize: "0.95rem", fontWeight: 600, color: "#c8e0f4", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: C.accent, fontSize: "0.7em" }}>◆</span>
              {children}
            </h3>
          );
        },
        hr() {
          return (
            <div className="my-5 flex items-center gap-2">
              <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, rgba(0,212,255,0.4), rgba(0,212,255,0.1), transparent)` }} />
              <span style={{ color: "rgba(0,212,255,0.4)", fontSize: "8px" }}>◆</span>
              <div style={{ height: "1px", flex: 1, background: `linear-gradient(270deg, rgba(0,212,255,0.4), rgba(0,212,255,0.1), transparent)` }} />
            </div>
          );
        },
        blockquote({ children }) {
          const text = String(children);
          const isWarning = text.includes("⚠") || text.includes("CRITICAL") || text.includes("WARNING");
          const isSuccess = text.includes("◈ OUTPUT") || text.includes("RÉSULTAT") || text.includes("COMPLETE");
          const isError   = text.includes("✖") || text.includes("ERROR");
          const isIntel   = text.includes("⎔") || text.includes("INTEL");

          const col = isWarning ? { border: C.warn,   bg: "rgba(245,158,11,0.06)" }
                    : isSuccess ? { border: "#22c55e", bg: "rgba(34,197,94,0.06)"  }
                    : isError   ? { border: C.danger,  bg: "rgba(239,68,68,0.06)"  }
                    : isIntel   ? { border: C.accent2, bg: "rgba(56,189,248,0.06)" }
                    :             { border: C.accent,  bg: "rgba(0,212,255,0.05)"  };

          return (
            <div className="my-3 px-4 py-3"
              style={{ borderLeft: `3px solid ${col.border}`, background: col.bg, borderRadius: "0 8px 8px 0" }}>
              {children}
            </div>
          );
        },
        ul({ children }) {
          return <ul className="my-2 space-y-1" style={{ paddingLeft: "0.5rem", listStyle: "none" }}>{children}</ul>;
        },
        li({ children }) {
          return (
            <li className="flex items-start gap-2 text-sm" style={{ color: "#8ab8d8", lineHeight: "1.6" }}>
              <span style={{ color: C.accent, marginTop: "4px", flexShrink: 0, fontSize: "8px" }}>◆</span>
              <span>{children}</span>
            </li>
          );
        },
        img({ src, alt }) {
          return (
            <div className="my-4">
              <img src={src} alt={alt || ""} className="rounded-xl w-full"
                style={{ maxWidth: "100%", border: "1px solid rgba(0,212,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              {alt && <p className="text-center mt-2" style={{ color: C.text3, fontSize: "11px", fontStyle: "italic" }}>{alt}</p>}
            </div>
          );
        },
        table({ children }) {
          return (
            <div className="my-4 overflow-x-auto" style={{ borderRadius: "8px", border: "1px solid rgba(0,212,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead style={{ background: "linear-gradient(90deg, rgba(0,212,255,0.1), rgba(0,212,255,0.04))" }}>{children}</thead>;
        },
        th({ children }) {
          return <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.accent, borderBottom: "1px solid rgba(0,212,255,0.15)" }}>{children}</th>;
        },
        td({ children }) {
          return <td style={{ padding: "9px 14px", color: "#8ab8d8", borderBottom: "1px solid rgba(0,212,255,0.05)", fontSize: "0.85rem" }}>{children}</td>;
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: C.accent, textDecoration: "underline", textDecorationColor: "rgba(0,212,255,0.3)", textUnderlineOffset: "3px" }}>
              {children}
            </a>
          );
        },
        strong({ children }) {
          return <strong style={{ color: C.text1, fontWeight: 700 }}>{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Tool Badge ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolBadge({ inv }: { inv: any }) {
  const [open, setOpen] = useState(false);
  const running = inv.state === "call" || inv.state === "partial-call";
  const result  = "result" in inv ? inv.result : undefined;
  const cfg = TOOL_CONFIG[inv.toolName as keyof typeof TOOL_CONFIG] ?? {
    sym: "⌖", label: "Tool", labelDone: "Done",
    color: C.text2, bg: "rgba(122,154,184,0.07)", border: "rgba(122,154,184,0.18)",
  };

  const webR  = result as WebSearchResult | undefined;
  const memR  = result as MemoryResult | undefined;
  const siteR = result as ReadWebsiteResult | undefined;

  const hasWebResults = inv.toolName === "webSearch"    && (webR?.results?.length ?? 0) > 0;
  const hasMemory     = inv.toolName === "manageMemory" && (memR?.memories?.length ?? 0) > 0;
  const hasSite       = inv.toolName === "readWebsite"  && !!siteR?.content;
  const isExpandable  = !running && (hasWebResults || hasMemory || hasSite);

  const getLabel = () => {
    if (running) {
      if (inv.toolName === "manageMemory") return inv.args?.action === "save" ? "Saving to memory..." : "Reading memory...";
      return cfg.label + "...";
    }
    if (inv.toolName === "manageMemory") return inv.args?.action === "save" ? "Memory saved" : "Memory read";
    return cfg.labelDone;
  };

  return (
    <div className="my-1.5 overflow-hidden" style={{ borderRadius: "8px", background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className={`flex items-center gap-2.5 px-3 py-2 ${isExpandable ? "cursor-pointer" : ""} select-none`}
        onClick={() => isExpandable && setOpen(!open)}>
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {running
            ? <div className="w-3 h-3 rounded-full border-2 border-transparent spin-anim" style={{ borderTopColor: cfg.color }} />
            : <span style={{ color: cfg.color, fontSize: "12px", fontWeight: 700 }}>{cfg.sym}</span>
          }
        </div>
        <span className={`text-xs font-medium flex-1 min-w-0 font-mono ${running ? "tool-running" : ""}`} style={{ color: cfg.color, letterSpacing: "0.03em" }}>
          {getLabel()}
          {inv.toolName === "webSearch" && inv.args?.query && (
            <span className="ml-2 font-normal" style={{ color: C.text3 }}>"{inv.args.query}"</span>
          )}
          {inv.toolName === "readWebsite" && inv.args?.url && (
            <span className="ml-2 font-normal truncate" style={{ color: C.text3 }}>
              {String(inv.args.url).replace(/^https?:\/\//, "").slice(0, 40)}
            </span>
          )}
          {inv.toolName === "manageMemory" && memR?.total !== undefined && (
            <span className="ml-2 font-normal" style={{ color: C.text3 }}>· {memR.total} facts</span>
          )}
          {hasWebResults && <span className="ml-2 font-normal" style={{ color: C.text3 }}>· {webR!.results.length} results</span>}
        </span>
        {result?.error && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: C.danger, border: "1px solid rgba(239,68,68,0.2)" }}>ERR</span>}
        {isExpandable && <ChevronRight size={12} style={{ color: C.text3, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none", flexShrink: 0 }} />}
      </div>

      {open && hasWebResults && (
        <div style={{ borderTop: `1px solid ${cfg.border}` }}>
          {webR!.results.map((r, i) => (
            <div key={i} className="flex gap-3 px-3 py-2" style={{ borderBottom: i < webR!.results.length - 1 ? `1px solid rgba(0,212,255,0.05)` : "none" }}>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: C.text3 }}>{String(i+1).padStart(2,"0")}</span>
              <div className="min-w-0 flex-1">
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: C.accent }} onClick={e => e.stopPropagation()}>
                  <span className="truncate">{r.title}</span>
                  <ExternalLink size={9} className="flex-shrink-0" />
                </a>
                {r.content && <p className="mt-0.5 text-xs" style={{ color: C.text3 }}>{r.content.slice(0,140)}{r.content.length>140?"…":""}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && hasMemory && (
        <div style={{ borderTop: `1px solid ${cfg.border}` }}>
          {memR!.memories!.map((fact, i) => (
            <div key={i} className="flex gap-2 px-3 py-2" style={{ borderBottom: i < memR!.memories!.length-1 ? `1px solid rgba(45,212,191,0.06)` : "none" }}>
              <span style={{ color: "#2dd4bf", fontSize: "11px" }}>▸</span>
              <span className="text-xs" style={{ color: C.text2 }}>{fact}</span>
            </div>
          ))}
        </div>
      )}
      {open && hasSite && (
        <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${cfg.border}` }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Link2 size={10} style={{ color: "#a78bfa" }} />
            <a href={siteR!.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline truncate" style={{ color: "#a78bfa" }}>{siteR!.url}</a>
          </div>
          <p className="text-xs" style={{ color: C.text3 }}>{siteR!.content.slice(0,240)}…</p>
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";
  return (
    <div className={`msg-enter flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <UserAvatar /> : <AIAvatar />}
      <div className={`flex flex-col gap-1.5 min-w-0 ${isUser ? "items-end max-w-[75%]" : "items-start flex-1"}`}>
        {!isUser && message.toolInvocations?.length > 0 && (
          <div className="w-full">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {message.toolInvocations.map((inv: any) => <ToolBadge key={inv.toolCallId} inv={inv} />)}
          </div>
        )}
        {message.content && (
          <div className="relative group/msg"
            style={isUser ? {
              background: "linear-gradient(135deg, #0a1e38 0%, #0d2848 100%)",
              borderRadius: "14px 14px 4px 14px",
              padding: "10px 16px",
              border: "1px solid rgba(0,212,255,0.25)",
              boxShadow: "0 4px 20px rgba(0,212,255,0.1), inset 0 1px 0 rgba(0,212,255,0.08)",
            } : {
              background: "rgba(10,22,40,0.7)",
              border: `1px solid rgba(0,212,255,0.08)`,
              borderRadius: "4px 14px 14px 14px",
              padding: "14px 16px",
              width: "100%",
              backdropFilter: "blur(8px)",
            }}
          >
            {isUser
              ? <p className="text-sm leading-relaxed" style={{ color: C.text1 }}>{message.content}</p>
              : <div className="text-sm"><MarkdownContent content={message.content} /></div>
            }
            {!isUser && (
              <div className="absolute -top-3 right-2 opacity-0 group-hover/msg:opacity-100 transition-all duration-200">
                <CopyBtn text={message.content} size="xs" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg-enter flex gap-3">
      <AIAvatar />
      <div className="flex items-center gap-1.5 px-4 py-3.5"
        style={{ background: "rgba(10,22,40,0.7)", border: `1px solid rgba(0,212,255,0.08)`, borderRadius: "4px 14px 14px 14px", backdropFilter: "blur(8px)" }}>
        <span className="dot-1 inline-block w-2 h-2 rounded-full" style={{ background: "rgba(0,212,255,0.4)" }} />
        <span className="dot-2 inline-block w-2 h-2 rounded-full" style={{ background: "rgba(0,212,255,0.4)" }} />
        <span className="dot-3 inline-block w-2 h-2 rounded-full" style={{ background: "rgba(0,212,255,0.4)" }} />
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ config, onSave, onClose }: { config: Config; onSave: (c: Config) => void; onClose: () => void; }) {
  const [local, setLocal] = useState<Config>(config);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = () => { onSave(local); setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backdropFilter: "blur(4px)" }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[440px] overflow-hidden fade-up"
        style={{ borderRadius: "16px", background: "rgba(6,13,26,0.98)", border: "1px solid rgba(0,212,255,0.15)", boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.05), 0 0 60px rgba(0,212,255,0.05)" }}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
              <Settings size={14} style={{ color: C.accent }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: C.text1 }}>Configuration</div>
              <div className="text-xs" style={{ color: C.text3 }}>Connect your LLM provider</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all"
            style={{ border: "1px solid rgba(0,212,255,0.08)" }}>
            <X size={14} style={{ color: C.text3 }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text3 }}>Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {(["groq", "openrouter"] as Provider[]).map(p => (
                <button key={p} onClick={() => setLocal({ ...local, provider: p, model: PROVIDER_MODELS[p][0].id })}
                  className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 text-left"
                  style={{
                    background: local.provider === p ? "rgba(0,212,255,0.1)" : "rgba(0,212,255,0.03)",
                    border: `1px solid ${local.provider === p ? "rgba(0,212,255,0.35)" : "rgba(0,212,255,0.08)"}`,
                    color: local.provider === p ? C.accent : C.text2,
                    boxShadow: local.provider === p ? "0 0 20px rgba(0,212,255,0.08)" : "none",
                  }}>
                  <div className="font-semibold">{p === "groq" ? "⚡ Groq" : "⬡ OpenRouter"}</div>
                  <div className="text-xs mt-0.5" style={{ color: local.provider === p ? "rgba(0,212,255,0.5)" : C.text3 }}>
                    {p === "groq" ? "Fast & free" : "200+ models"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text3 }}>Model</label>
            <div className="relative">
              <select className="w-full px-4 py-3 rounded-xl text-sm appearance-none pr-9 outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)", color: C.text1 }}
                value={local.model} onChange={e => setLocal({ ...local, model: e.target.value })}>
                {PROVIDER_MODELS[local.provider].map(m => (
                  <option key={m.id} value={m.id} style={{ background: "#0a1628" }}>{m.label}{m.badge ? ` — ${m.badge}` : ""}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.text3 }} />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text3 }}>API Key</label>
            <div className="relative input-focus" style={{ borderRadius: "12px", border: "1px solid rgba(0,212,255,0.1)", transition: "all 0.2s" }}>
              <input type={showKey ? "text" : "password"}
                className="w-full px-4 py-3 rounded-xl text-sm pr-11 outline-none bg-transparent"
                style={{ color: C.text1, fontFamily: showKey ? "inherit" : "monospace" }}
                placeholder={local.provider === "groq" ? "gsk_••••••••••••••••" : "sk-or-••••••••••••••••"}
                value={local.apiKey} onChange={e => setLocal({ ...local, apiKey: e.target.value })} />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: C.text3 }}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <a href={local.provider === "groq" ? "https://console.groq.com" : "https://openrouter.ai/keys"}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs hover:opacity-80" style={{ color: C.accent }}>
              <ExternalLink size={10} /> Get your free API key
            </a>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.08)" }}>
            <div className="px-4 py-2.5" style={{ background: "rgba(0,212,255,0.03)", borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.text3 }}>Active Tools</span>
            </div>
            {[
              { sym: "◈", label: "Web Search",       sub: "Tavily API",    color: C.accent  },
              { sym: "⟁", label: "Read + Scrape",    sub: "Jina Reader",   color: "#a78bfa" },
              { sym: "▣", label: "Long-term Memory", sub: "Local JSON",    color: "#2dd4bf" },
              { sym: "◉", label: "Vision",           sub: "Gemini Flash",  color: C.warn    },
              { sym: "◆", label: "Execute Python",   sub: "Piston API",    color: "#4ade80" },
              { sym: "⬡", label: "Generate Image",   sub: "Pollinations",  color: "#f472b6" },
            ].map((t, i, arr) => (
              <div key={t.label} className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: i < arr.length-1 ? "1px solid rgba(0,212,255,0.04)" : "none" }}>
                <span style={{ color: t.color, fontSize: "14px", fontWeight: 700 }}>{t.sym}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: t.color }}>{t.label}</div>
                  <div className="text-xs" style={{ color: C.text3 }}>{t.sub}</div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                  <div className="w-1 h-1 rounded-full pulse-dot" style={{ background: C.green }} />
                  <span className="text-xs font-medium" style={{ color: C.green }}>ON</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={save} className="btn-accent w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ color: "#050e1c" }}>
            {saved ? <><Check size={15} /> Saved!</> : <><Zap size={15} /> Save Configuration</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ hasKey, onSettings, onClear, msgCount, collapsed, onToggle }: {
  hasKey: boolean; onSettings: () => void; onClear: () => void;
  msgCount: number; collapsed: boolean; onToggle: () => void;
}) {
  const [active, setActive] = useState("chat");
  const items = [
    { id: "chat",     label: "Chat",     icon: MessageSquare, count: msgCount },
    { id: "tasks",    label: "Tasks",    icon: ListTodo },
    { id: "memory",   label: "Memory",   icon: Brain },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const sidebarBg  = "rgba(5,11,22,0.97)";
  const sidebarBrd = "rgba(0,212,255,0.06)";

  if (collapsed) {
    return (
      <aside className="flex-shrink-0 flex flex-col items-center py-4 gap-3"
        style={{ width: 64, background: sidebarBg, borderRight: `1px solid ${sidebarBrd}` }}>
        <Logo size={36} />
        <div className="w-8 h-px" style={{ background: "rgba(0,212,255,0.1)" }} />
        {items.map(({ id, label, icon: Icon, count }) => (
          <button key={id} title={label}
            onClick={() => id === "settings" ? onSettings() : setActive(id)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all relative"
            style={{
              background: active === id && id !== "settings" ? "rgba(0,212,255,0.1)" : "transparent",
              border: `1px solid ${active === id && id !== "settings" ? "rgba(0,212,255,0.25)" : "transparent"}`,
              color: active === id && id !== "settings" ? C.accent : C.text3,
            }}>
            <Icon size={16} />
            {count !== undefined && count > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: C.accent, fontSize: "9px", color: "#050e1c", fontWeight: 700 }}>
                {count > 9 ? "9+" : count}
              </div>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onToggle} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all" style={{ color: C.text3 }}>
          <PanelLeft size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex-shrink-0 flex flex-col h-full"
      style={{ width: 220, background: sidebarBg, borderRight: `1px solid ${sidebarBrd}` }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${sidebarBrd}` }}>
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div>
            <div className="text-sm font-bold" style={{ color: C.text1, letterSpacing: "-0.02em" }}>DarkosClaw</div>
            <div className="text-xs font-mono" style={{ color: "rgba(0,212,255,0.4)" }}>v2.1 // ONLINE</div>
          </div>
        </div>
        <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-all" style={{ color: C.text3 }}>
          <PanelLeftClose size={13} />
        </button>
      </div>

      <div className="px-3 pt-3 pb-1">
        <button onClick={onClear}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
          style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.15)", color: C.accent }}>
          <Plus size={13} /> New conversation
        </button>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {items.map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => id === "settings" ? onSettings() : setActive(id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
            style={{
              background: active === id && id !== "settings" ? "rgba(0,212,255,0.08)" : "transparent",
              borderLeft: active === id && id !== "settings" ? `2px solid ${C.accent}` : "2px solid transparent",
              paddingLeft: active === id && id !== "settings" ? "10px" : "12px",
              color: active === id && id !== "settings" ? C.accent : C.text3,
            }}>
            <Icon size={15} />
            <span className="flex-1">{label}</span>
            {count !== undefined && count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(0,212,255,0.12)", color: C.accent }}>{count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4" style={{ borderTop: `1px solid ${sidebarBrd}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: hasKey ? C.green : C.danger }} />
            <span className="text-xs font-medium font-mono" style={{ color: hasKey ? C.green : C.danger }}>
              {hasKey ? "ONLINE" : "NO_KEY"}
            </span>
          </div>
          {!hasKey && (
            <button onClick={onSettings} className="text-xs px-2 py-1 rounded-md"
              style={{ background: "rgba(0,212,255,0.08)", color: C.accent, border: "1px solid rgba(0,212,255,0.2)" }}>
              Setup
            </button>
          )}
        </div>
        <div className="text-xs font-mono" style={{ color: C.text3 }}>22 tools · Free LLMs</div>
      </div>
    </aside>
  );
}

// ─── Prompt suggestions ───────────────────────────────────────────────────────
const PROMPTS = [
  { sym: "◈", text: "What's happening in the world today?", sub: "Live web search"  },
  { sym: "▣", text: "Latest AI model releases this week",   sub: "Current tech news" },
  { sym: "⟁", text: "Write a Python async web scraper",    sub: "With error handling"},
  { sym: "◆", text: "Explain quantum entanglement",         sub: "Clear breakdown"   },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DarkosClaw() {
  const [config, setConfig]             = useState<Config>({ apiKey: "", provider: "groq", model: "llama-3.3-70b-versatile" });
  const [showSettings, setShowSettings] = useState(false);
  const [hasKey, setHasKey]             = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("darkosclaw_config");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const valid = Object.values(PROVIDER_MODELS).flat().map(m => m.id);
        if (!valid.includes(parsed.model)) { parsed.model = "llama-3.3-70b-versatile"; localStorage.setItem("darkosclaw_config", JSON.stringify(parsed)); }
        setConfig(parsed);
        setHasKey(!!parsed.apiKey);
      } catch {}
    } else { setShowSettings(true); }
  }, []);

  const handleSaveConfig = (c: Config) => {
    setConfig(c); setHasKey(!!c.apiKey);
    localStorage.setItem("darkosclaw_config", JSON.stringify(c));
    setShowSettings(false);
  };

  const { messages, input, setInput, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
    body: { apiKey: config.apiKey, provider: config.provider, model: config.model },
    onError: err => console.error("Chat error:", err),
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && hasKey) handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isUsingTool = isLoading && messages.some((m: any) => m.toolInvocations?.some((t: any) => t.state === "call" || t.state === "partial-call"));
  const currentModelLabel = PROVIDER_MODELS[config.provider]?.find(m => m.id === config.model)?.label || config.model;

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-animated">
      <div className="relative z-10 flex w-full h-full">
        <Sidebar hasKey={hasKey} onSettings={() => setShowSettings(true)} onClear={() => setMessages([])}
          msgCount={messages.length} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5"
            style={{ borderBottom: "1px solid rgba(0,212,255,0.06)", background: "rgba(5,10,20,0.85)", backdropFilter: "blur(20px)" }}>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: C.text1 }}>Chat</h1>
              {hasKey && <span className="text-xs font-mono" style={{ color: C.text3 }}>{config.provider === "groq" ? "Groq" : "OpenRouter"} · {currentModelLabel}</span>}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.08)" }}>
                <Command size={10} style={{ color: C.text3 }} />
                <span className="text-xs font-mono" style={{ color: C.text3 }}>Enter</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: C.green }} />
                <span className="text-xs font-medium font-mono" style={{ color: C.green }}>ONLINE</span>
              </div>
              <button onClick={() => setShowSettings(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all"
                style={{ border: "1px solid rgba(0,212,255,0.08)", color: C.text3 }}>
                <Settings size={14} />
              </button>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all"
                  style={{ border: "1px solid rgba(0,212,255,0.08)", color: C.text3 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-8">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center fade-up">
                <div className="mb-8">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="claw-pulse" style={{ borderRadius: "50%", padding: "4px" }}>
                        <Logo size={72} />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: C.green, border: `2px solid ${C.bg}` }}>
                        <Sparkles size={10} style={{ color: "#050e1c" }} />
                      </div>
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-3" style={{ color: C.text1, letterSpacing: "-0.04em", lineHeight: 1.15 }}>
                    DarkosClaw{" "}
                    <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      OS // v2.1
                    </span>
                  </h2>
                  <p className="text-sm font-mono" style={{ color: C.text3, maxWidth: "380px", margin: "0 auto" }}>
                    {hasKey ? "◈ SYSTEM READY — 22 tools loaded — awaiting command" : "⚠ NO_API_KEY — configure to initialize"}
                  </p>
                </div>

                {hasKey && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    {["◈ Web Search", "⟁ Page Reader", "▣ Memory", "◉ Vision", "◆ Code Exec", "⬡ Image Gen"].map(c => (
                      <div key={c} className="px-3 py-1.5 rounded-full text-xs font-mono"
                        style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.12)", color: C.text2 }}>
                        {c}
                      </div>
                    ))}
                  </div>
                )}

                {!hasKey ? (
                  <button onClick={() => setShowSettings(true)}
                    className="btn-accent flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-semibold"
                    style={{ color: "#050e1c" }}>
                    <Settings size={15} /> Initialize System
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {PROMPTS.map(p => (
                      <button key={p.text} onClick={() => setInput(p.text)}
                        className="text-left px-4 py-3.5 rounded-xl transition-all duration-200 group"
                        style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.08)" }}>
                        <div className="flex items-start gap-3">
                          <span className="text-sm flex-shrink-0 mt-0.5 font-mono font-bold" style={{ color: C.accent }}>{p.sym}</span>
                          <div>
                            <div className="text-sm font-medium mb-0.5 group-hover:text-white transition-colors" style={{ color: C.text1 }}>{p.text}</div>
                            <div className="text-xs font-mono" style={{ color: C.text3 }}>{p.sub}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {messages.map((msg: any) => <MessageBubble key={msg.id} message={msg} />)}
                {isLoading && !isUsingTool && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 sm:px-8 py-5"
            style={{ background: "rgba(5,10,20,0.9)", borderTop: "1px solid rgba(0,212,255,0.06)", backdropFilter: "blur(20px)" }}>
            <div className="max-w-3xl mx-auto">
              <div className="input-focus flex gap-3 items-end rounded-xl px-4 py-3 transition-all"
                style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(0,212,255,0.1)", backdropFilter: "blur(12px)" }}>
                <textarea ref={inputRef}
                  className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed font-mono"
                  style={{ color: C.text1, caretColor: C.accent, minHeight: "26px", maxHeight: "180px", lineHeight: "1.6" }}
                  rows={1}
                  placeholder={hasKey ? "◈ Enter command… (⇧ Enter for newline)" : "⚠ Configure API key to initialize…"}
                  value={input}
                  onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px"; }}
                  onKeyDown={handleKeyDown}
                  disabled={!hasKey || isLoading}
                />
                <button type="button"
                  onClick={e => handleSubmit(e as unknown as React.FormEvent)}
                  disabled={!input.trim() || isLoading || !hasKey}
                  className="flex-shrink-0 flex items-center justify-center rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{
                    width: 38, height: 38,
                    background: input.trim() && !isLoading && hasKey ? `linear-gradient(135deg, ${C.accent3}, ${C.accent})` : "rgba(0,212,255,0.06)",
                    boxShadow: input.trim() && !isLoading && hasKey ? "0 4px 14px rgba(0,212,255,0.3)" : "none",
                    border: "1px solid rgba(0,212,255,0.12)",
                  }}>
                  <Send size={15} style={{ color: input.trim() && !isLoading && hasKey ? "#050e1c" : C.text3 }} />
                </button>
              </div>
              <p className="text-center mt-2.5 text-xs font-mono" style={{ color: "rgba(0,212,255,0.15)" }}>
                ⎔ DARKOSCLAW_OS · 22 TOOLS · FREE_LLMS · ZERO_COST
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSettings && <SettingsModal config={config} onSave={handleSaveConfig} onClose={() => setShowSettings(false)} />}
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
