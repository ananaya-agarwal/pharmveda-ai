import { useState } from "react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const inputClass =
  "border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded px-2 py-1 w-full";

function MedicineRow({ documentId, medicine, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: medicine.name,
    dosage: medicine.dosage || "",
    frequency: medicine.frequency || "",
  });
  const { showToast } = useToast();

  const save = async () => {
    try {
      const updated = await api.updateMedicine(documentId, medicine.id, draft);
      onChange(updated);
      setEditing(false);
      showToast("Medicine updated.");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const remove = async () => {
    try {
      const updated = await api.deleteMedicine(documentId, medicine.id);
      onChange(updated);
      showToast("Medicine removed.");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (!editing) {
    return (
      <tr className="border-b border-gray-100 dark:border-gray-800">
        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{medicine.name}</td>
        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{medicine.dosage}</td>
        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{medicine.frequency}</td>
        <td className="py-2 px-3 text-right space-x-2">
          <button onClick={() => setEditing(true)} className="text-teal-700 dark:text-teal-400 underline text-sm">
            Edit
          </button>
          <button onClick={remove} className="text-red-600 dark:text-red-400 underline text-sm">
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 bg-teal-50 dark:bg-teal-950/30">
      <td className="py-1 px-2">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} />
      </td>
      <td className="py-1 px-2">
        <input value={draft.dosage} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} className={inputClass} />
      </td>
      <td className="py-1 px-2">
        <input value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} className={inputClass} />
      </td>
      <td className="py-1 px-2 text-right space-x-2">
        <button onClick={save} className="text-teal-700 dark:text-teal-400 underline text-sm">
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-500 dark:text-gray-400 underline text-sm">
          Cancel
        </button>
      </td>
    </tr>
  );
}

function LabValueRow({ documentId, labValue, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    test_name: labValue.test_name,
    value: labValue.value,
    unit: labValue.unit || "",
    taken_at: labValue.taken_at,
  });
  const { showToast } = useToast();

  const save = async () => {
    try {
      const updated = await api.updateLabValue(documentId, labValue.id, {
        ...draft,
        value: parseFloat(draft.value),
      });
      onChange(updated);
      setEditing(false);
      showToast("Lab value updated.");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const remove = async () => {
    try {
      const updated = await api.deleteLabValue(documentId, labValue.id);
      onChange(updated);
      showToast("Lab value removed.");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (!editing) {
    return (
      <tr className="border-b border-gray-100 dark:border-gray-800">
        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{labValue.test_name}</td>
        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{labValue.value}</td>
        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{labValue.unit}</td>
        <td className="py-2 px-3 text-right space-x-2">
          <button onClick={() => setEditing(true)} className="text-teal-700 dark:text-teal-400 underline text-sm">
            Edit
          </button>
          <button onClick={remove} className="text-red-600 dark:text-red-400 underline text-sm">
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 bg-teal-50 dark:bg-teal-950/30">
      <td className="py-1 px-2">
        <input value={draft.test_name} onChange={(e) => setDraft({ ...draft, test_name: e.target.value })} className={inputClass} />
      </td>
      <td className="py-1 px-2">
        <input
          type="number"
          step="any"
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
          className={inputClass}
        />
      </td>
      <td className="py-1 px-2">
        <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className={inputClass} />
      </td>
      <td className="py-1 px-2 text-right space-x-2">
        <button onClick={save} className="text-teal-700 dark:text-teal-400 underline text-sm">
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-500 dark:text-gray-400 underline text-sm">
          Cancel
        </button>
      </td>
    </tr>
  );
}

export default function ExtractedFieldsTable({ document, onChange }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Medicines</h3>
        {document.medicines.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">None extracted.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 dark:border-gray-800 rounded overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-700 dark:text-gray-300">
              <tr>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Dosage</th>
                <th className="py-2 px-3">Frequency</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {document.medicines.map((m) => (
                <MedicineRow key={m.id} documentId={document.id} medicine={m} onChange={onChange} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Lab values</h3>
        {document.lab_values.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">None extracted.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 dark:border-gray-800 rounded overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-700 dark:text-gray-300">
              <tr>
                <th className="py-2 px-3">Test</th>
                <th className="py-2 px-3">Value</th>
                <th className="py-2 px-3">Unit</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {document.lab_values.map((l) => (
                <LabValueRow key={l.id} documentId={document.id} labValue={l} onChange={onChange} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
