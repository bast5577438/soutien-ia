"use client";

import { useEffect, useRef, useState } from "react";
import { useAmbientSound } from "@/lib/useAmbientSound";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Salut, je suis là. Tu peux me raconter ce qui te pèse, à ton rythme. Qu'est-ce qui se passe ?",
};

function SpeakerOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M4 9v6h4l5 5V4L8 9H4z"
        fill="currentColor"
      />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" />
      <path
        d="M16 9l5 6m0-6l-5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { enabled: soundOn, toggle: toggleSound } = useAmbientSound();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Réponse invalide");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: snapshot },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Désolé, j'ai eu un souci de connexion. Tu peux réessayer ?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-screen flex-1 flex-col overflow-hidden bg-gradient-to-br from-zinc-950 via-slate-950 to-black">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl mix-blend-screen animate-breathe" />
      <div
        className="pointer-events-none absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-500/25 blur-3xl mix-blend-screen animate-breathe-slow"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl mix-blend-screen animate-breathe"
        style={{ animationDelay: "4s" }}
      />

      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/5 bg-zinc-900/50 px-5 py-4 backdrop-blur-xl">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-300 via-violet-200 to-fuchsia-300 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
            Un espace pour souffler
          </h1>
          <p className="text-sm text-zinc-500">
            Ceci n&apos;est pas un substitut à un suivi professionnel.
          </p>
        </div>
        <button
          onClick={toggleSound}
          aria-pressed={soundOn}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-indigo-400/40 hover:text-indigo-300"
        >
          {soundOn ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
          <span className="hidden sm:inline">Ambiance sonore</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`animate-fade-in-up max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "self-end bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/40"
                  : "self-start bg-zinc-900/80 text-zinc-100 ring-1 ring-white/5"
              }`}
            >
              {m.content || (m.role === "assistant" && loading ? "…" : "")}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-zinc-900/50 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écris ce que tu ressens…"
              className="flex-1 rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-950/50 transition hover:from-indigo-400 hover:to-violet-500 disabled:opacity-30"
            >
              Envoyer
            </button>
          </div>
          <p className="text-center text-xs text-zinc-500">
            En cas d&apos;urgence : 3114 (prévention suicide, 24h/24, gratuit) · 15 (SAMU) · 112
          </p>
        </div>
      </footer>
    </div>
  );
}
