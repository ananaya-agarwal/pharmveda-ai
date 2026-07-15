import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { severityStyles } from "../lib/interactionStyles";

const SUGGESTIONS = [
  "What does high creatinine mean?",
  "Explain my current medicines in plain language",
  "Are there any interactions I should know about?",
  "What should I ask my doctor at my next visit?",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function normalize(name) {
  return name.trim().toLowerCase();
}

function nameOverlaps(a, b) {
  return a.includes(b) || b.includes(a);
}

// Only surface interactions that involve a medicine from *this* scan, so the card
// reads as "here's what's new" rather than dumping the user's entire interaction
// history after every upload.
function relevantInteractions(allInteractions, medicines) {
  const scannedNames = medicines.map((m) => normalize(m.name));
  return allInteractions.filter((w) => {
    const a = normalize(w.drug_a);
    const b = normalize(w.drug_b);
    return scannedNames.some((n) => nameOverlaps(a, n) || nameOverlaps(b, n));
  });
}

function TypingDots({ label }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
      </div>
      {label && <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>}
    </div>
  );
}

function ScanResultCard({ result }) {
  const { document, interactions, notice } = result;
  const hasMedicines = document.medicines.length > 0;
  const hasLabs = document.lab_values.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-800 dark:text-gray-200">
        Scanned <span className="font-medium">{document.filename}</span> — here's what I could
        read.
      </p>

      {!hasMedicines && !hasLabs ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {notice || "I couldn't confidently pull out any medicines or lab values from this one."}{" "}
          <Link to={`/documents/${document.id}`} className="text-teal-700 dark:text-teal-400 underline">
            View raw text &amp; edit manually
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {document.medicines.map((m) => (
            <div key={`med-${m.id}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                {m.name} {m.dosage}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                {m.frequency || "—"}
              </span>
            </div>
          ))}
          {document.lab_values.map((l) => (
            <div key={`lab-${l.id}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                {l.test_name}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                {l.value} {l.unit || ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {interactions.length > 0 && (
        <div className="flex flex-col gap-2">
          {interactions.map((w, i) => (
            <div
              key={i}
              className={`border rounded-lg px-3 py-2 text-xs ${severityStyles[w.severity] || severityStyles.moderate}`}
            >
              <p className="font-semibold">
                ⚠ {w.drug_a} + {w.drug_b} ({w.severity})
              </p>
              <p>{w.description}</p>
            </div>
          ))}
        </div>
      )}

      {(hasMedicines || hasLabs) && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          <Link to={`/documents/${document.id}`} className="text-teal-700 dark:text-teal-400 underline">
            View &amp; edit full details
          </Link>{" "}
          · Ask me anything about this, or scan your next report.
        </p>
      )}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const initial = user?.email?.[0]?.toUpperCase() || "?";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [question]);

  const replaceLast = (updater) => {
    setMessages((m) => {
      const next = [...m];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  };

  const streamExplanation = async (documentId) => {
    setMessages((m) => [...m, { kind: "text", role: "assistant", text: "", at: new Date(), streaming: true }]);
    try {
      await api.explainDocument(documentId, (_chunk, full) => {
        replaceLast((msg) => ({ ...msg, text: full }));
      });
      replaceLast((msg) => ({ ...msg, streaming: false }));
    } catch {
      // Non-fatal: the scan card already landed, so drop the empty follow-up bubble
      // rather than showing an error for what's an optional add-on explanation.
      setMessages((m) => m.slice(0, -1));
    }
  };

  const sendMessage = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    setQuestion("");
    setBusy(true);
    setError("");
    setMessages((m) => [
      ...m,
      { kind: "text", role: "user", text: q, at: new Date() },
      { kind: "text", role: "assistant", text: "", at: new Date(), streaming: true },
    ]);

    try {
      await api.askChat(q, (_chunk, full) => {
        replaceLast((msg) => ({ ...msg, text: full }));
      });
      replaceLast((msg) => ({ ...msg, streaming: false }));
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  const scanFile = async (file) => {
    if (busy) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }

    setBusy(true);
    setError("");
    setMessages((m) => [
      ...m,
      { kind: "file", role: "user", fileName: file.name, at: new Date() },
      { kind: "scanning", role: "assistant", at: new Date() },
    ]);

    let uploaded = null;
    try {
      uploaded = await api.uploadDocument(file);
      const allInteractions = await api.getInteractions().catch(() => []);
      const interactions = relevantInteractions(allInteractions, uploaded.medicines);
      replaceLast(() => ({
        kind: "scan-result",
        role: "assistant",
        result: { document: uploaded, interactions },
        at: new Date(),
      }));
    } catch (err) {
      replaceLast(() => ({ kind: "text", role: "assistant", text: err.message, error: true, at: new Date() }));
      setBusy(false);
      return;
    }

    const hasExtractedData = uploaded.medicines.length > 0 || uploaded.lab_values.length > 0;
    if (hasExtractedData) {
      await streamExplanation(uploaded.id);
    }
    setBusy(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(question);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(question);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) scanFile(file);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between px-4 sm:px-0 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">PharmVeda AI</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your digital health twin</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-400 hover:text-teal-700 dark:hover:text-teal-400 shrink-0 ml-3"
          >
            Clear chat
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-0 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <img
              src="/logo.png"
              alt="PharmVeda AI logo"
              className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-teal-100 dark:ring-teal-900 mb-4"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Hi, I'm your PharmVeda assistant
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
              Scan a prescription or lab report with the button below, or ask me about your
              medicines, lab results, and general health questions.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => {
              if (m.kind === "file") {
                return (
                  <div key={i} className="flex items-center gap-2 self-end justify-end max-w-[85%] ml-auto">
                    <div className="flex items-center gap-2 bg-teal-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" clipRule="evenodd" />
                        <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                      </svg>
                      <span className="text-sm font-medium truncate max-w-[220px]">{m.fileName}</span>
                    </div>
                    <span className="h-7 w-7 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {initial}
                    </span>
                  </div>
                );
              }

              if (m.kind === "scanning") {
                return (
                  <div key={i} className="flex items-end gap-2 self-start max-w-[85%]">
                    <img src="/logo.png" alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-teal-100 dark:ring-teal-900 shrink-0" />
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <TypingDots label="Scanning document…" />
                    </div>
                  </div>
                );
              }

              if (m.kind === "scan-result") {
                return (
                  <div key={i} className="flex items-end gap-2 self-start max-w-[90%]">
                    <img src="/logo.png" alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-teal-100 dark:ring-teal-900 shrink-0" />
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm w-full">
                      <ScanResultCard result={m.result} />
                    </div>
                  </div>
                );
              }

              // kind === "text"
              return m.role === "user" ? (
                <div key={i} className="flex items-end gap-2 self-end justify-end max-w-[85%] ml-auto">
                  <div className="flex flex-col items-end">
                    <div className="bg-teal-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 whitespace-pre-wrap break-words shadow-sm">
                      {m.text}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 mr-1">{formatTime(m.at)}</span>
                  </div>
                  <span className="h-7 w-7 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {initial}
                  </span>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2 self-start max-w-[85%]">
                  <img src="/logo.png" alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-teal-100 dark:ring-teal-900 shrink-0" />
                  <div className="flex flex-col items-start">
                    <div
                      className={
                        "rounded-2xl rounded-bl-sm px-4 py-2.5 whitespace-pre-wrap break-words shadow-sm min-w-[2.5rem] " +
                        (m.error
                          ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
                          : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200")
                      }
                    >
                      {m.streaming && !m.text ? (
                        <TypingDots />
                      ) : (
                        <>
                          {m.text}
                          {m.streaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-teal-600 dark:bg-teal-400 ml-0.5 align-middle animate-pulse" />
                          )}
                        </>
                      )}
                    </div>
                    {!m.streaming && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-1">{formatTime(m.at)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-0 pb-4 pt-2">
        {error && (
          <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 mb-2">
            {error}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="Scan or upload a document"
            title="Scan or upload a prescription/lab report"
            className="shrink-0 bg-amber-500 text-white rounded-xl h-9 w-9 flex items-center justify-center hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path
                fillRule="evenodd"
                d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a medicine or report…"
            className="flex-1 resize-none max-h-40 outline-none text-sm py-1.5 leading-relaxed bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            aria-label="Send message"
            className="shrink-0 bg-teal-600 text-white rounded-full h-9 w-9 flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 rotate-90">
              <path d="M3.4 2.5a.75.75 0 0 0-.926.94l1.85 5.55a.75.75 0 0 0 .71.51h4.216a.75.75 0 0 1 0 1.5H5.034a.75.75 0 0 0-.71.51l-1.85 5.55a.75.75 0 0 0 .926.94 60.4 60.4 0 0 0 16.579-8.4.75.75 0 0 0 0-1.28A60.4 60.4 0 0 0 3.4 2.5Z" />
            </svg>
          </button>
        </form>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
          PharmVeda AI can make mistakes. This is not medical advice — always consult a doctor.
        </p>
      </div>
    </div>
  );
}
