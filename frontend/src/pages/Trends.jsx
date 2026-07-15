import { useEffect, useState } from "react";
import { api } from "../api";
import TrendChart from "../components/TrendChart";

function TrendsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 animate-pulse">
      {[0, 1].map((i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 h-56">
          <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="h-36 bg-gray-100 dark:bg-gray-800/60 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Trends() {
  const [series, setSeries] = useState(null);

  useEffect(() => {
    api.getTrends().then(setSeries).catch(() => setSeries([]));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Lab value trends</h1>
      {series === null && <TrendsSkeleton />}
      {series?.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3">
            <path fillRule="evenodd" d="M3 2.25a.75.75 0 0 1 .75.75v18.75h17.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Zm5.03 5.53a.75.75 0 0 1 1.06 0l3.22 3.22 3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.22-3.22-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No trends yet — a metric needs to appear in at least two documents before a trend
            chart is shown.
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {series?.map((s) => (
          <TrendChart key={s.test_name} series={s} />
        ))}
      </div>
    </div>
  );
}
