import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const pickFile = (candidate) => {
    if (!candidate) return;
    const ext = "." + candidate.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }
    setError("");
    setFile(candidate);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const doc = await api.uploadDocument(file);
      showToast("Document uploaded — extraction complete.");
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-1 text-gray-900 dark:text-gray-100">
        Upload a prescription or lab report
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        We'll run OCR and pull out medicines and lab values automatically — you can correct
        anything afterward.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={
            "cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors " +
            (dragActive
              ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40"
              : "border-gray-300 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-600 bg-white dark:bg-gray-900")
          }
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9 text-teal-600 dark:text-teal-400">
                <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
                <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
              </svg>
              <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatSize(file.size)}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-xs text-red-600 dark:text-red-400 underline mt-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9 text-gray-300 dark:text-gray-600">
                <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="text-teal-700 dark:text-teal-400 font-medium">Click to browse</span> or drag a file here
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">PDF, JPG, or PNG</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!file || uploading}
          className="bg-teal-600 text-white rounded-lg px-3 py-2.5 font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {uploading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {uploading ? "Uploading & running OCR…" : "Upload"}
        </button>
      </form>

      <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
        OCR accuracy is best on clearly printed/typed documents — handwritten prescriptions may
        extract poorly.
      </p>
    </div>
  );
}
