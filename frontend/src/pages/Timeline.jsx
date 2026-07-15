import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import InteractionBanner from "../components/InteractionBanner";

function TimelineSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6 ml-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3">
        <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 0 1 8.75 1h6.5A2.75 2.75 0 0 1 18 3.75v16.5a.75.75 0 0 1-1.075.676L12 18.677l-4.925 2.25A.75.75 0 0 1 6 20.25V3.75Z" clipRule="evenodd" />
      </svg>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
        No documents yet. Upload a prescription or lab report to get started.
      </p>
      <Link
        to="/upload"
        className="text-sm bg-teal-600 text-white rounded-lg px-4 py-2 hover:bg-teal-700 transition-colors"
      >
        Upload a document
      </Link>
    </div>
  );
}

export default function Timeline() {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    api.getTimeline().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Health timeline</h1>
      <InteractionBanner />

      {entries === null && <TimelineSkeleton />}
      {entries?.length === 0 && <EmptyState />}

      {entries && entries.length > 0 && (
        <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-2">
          {entries.map((entry) => (
            <li key={entry.id} className="mb-6 ml-4">
              <div className="absolute w-2 h-2 bg-teal-600 rounded-full -left-1 mt-1.5" />
              <time className="text-xs text-gray-500 dark:text-gray-500">
                {new Date(entry.date).toLocaleDateString()}
              </time>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <Link to={`/documents/${entry.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">
                  {entry.summary}
                </Link>{" "}
                <span className="text-gray-400 dark:text-gray-500">({entry.doc_type})</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
