import { useEffect, useState } from "react";
import { api } from "../api";
import { severityStyles } from "../lib/interactionStyles";

export default function InteractionBanner() {
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    api.getInteractions().then(setWarnings).catch(() => setWarnings([]));
  }, []);

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-6">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`border rounded-lg px-4 py-3 text-sm ${severityStyles[w.severity] || severityStyles.moderate}`}
        >
          <p className="font-semibold">
            ⚠ Possible interaction: {w.drug_a} + {w.drug_b} ({w.severity})
          </p>
          <p>{w.description}</p>
          <p className="italic mt-1">Please discuss this with your doctor.</p>
        </div>
      ))}
    </div>
  );
}
