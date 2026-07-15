import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import ExtractedFieldsTable from "../components/ExtractedFieldsTable";
import InteractionBanner from "../components/InteractionBanner";

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDocument(id).then(setDocument).catch((err) => setError(err.message));
  }, [id]);

  const handleExplain = async () => {
    setExplaining(true);
    setError("");
    setDocument((d) => ({ ...d, explanation: "" }));
    try {
      await api.explainDocument(id, (_chunk, full) => {
        setDocument((d) => ({ ...d, explanation: full }));
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setExplaining(false);
    }
  };

  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!document) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1 text-gray-900 dark:text-gray-100">{document.filename}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Uploaded {new Date(document.uploaded_at).toLocaleString()}
        {document.extracted_date &&
          ` · document date ${new Date(document.extracted_date).toLocaleDateString()}`}
      </p>

      <InteractionBanner />

      <ExtractedFieldsTable document={document} onChange={setDocument} />

      <div className="mt-6">
        <button
          onClick={handleExplain}
          disabled={explaining}
          className="bg-teal-600 text-white rounded px-3 py-2 hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {explaining ? "Generating explanation…" : "Explain in plain language"}
        </button>
      </div>

      {(document.explanation || explaining) && (
        <div className="mt-4 p-4 border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/30 rounded-lg whitespace-pre-wrap text-sm min-h-[3rem] text-gray-800 dark:text-gray-200">
          {document.explanation ? (
            <>
              {document.explanation}
              {explaining && (
                <span className="inline-block w-1.5 h-3.5 bg-teal-600 dark:bg-teal-400 ml-0.5 align-middle animate-pulse" />
              )}
            </>
          ) : (
            <div className="flex gap-1 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" />
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => setShowRawText((v) => !v)}
          className="text-sm text-gray-500 dark:text-gray-400 underline"
        >
          {showRawText ? "Hide" : "Show"} raw OCR text
        </button>
        {showRawText && (
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 rounded text-xs whitespace-pre-wrap max-h-64 overflow-auto">
            {document.raw_ocr_text || "(no text extracted)"}
          </pre>
        )}
      </div>
    </div>
  );
}
