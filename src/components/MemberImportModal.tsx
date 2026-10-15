import { useMemo, useState } from "react";
import { Modal } from "flowbite-react";
import { toast } from "react-toastify";

type Row = { line: number; data?: Record<string, string>; school_id?: string; email?: string; valid?: boolean; status?: string; activation_link?: string | null; errors?: string[]; error?: string | null };
const headers = "school_id,email,first_name,middle_name,last_name,course,year,section\r\n";
const secondaryButton = "rounded border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600";
const save = (name: string, contents: string, type: string) => {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([contents], { type }));
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
};

export default function MemberImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reused, setReused] = useState(false);
  const summary = useMemo(() => {
    const valid = rows.filter((row) => row.valid || ["pending", "registered"].includes(row.status || "")).length;
    const invalid = rows.length - valid;
    const duplicates = rows.filter((row) => [...(row.errors || []), row.error || ""].some((error) => /duplicate/i.test(error))).length;
    const existing = rows.filter((row) => [...(row.errors || []), row.error || ""].some((error) => /already exists|registered/i.test(error))).length;
    return { valid, invalid, duplicates, existing };
  }, [rows]);

  const send = async (mode: "preview" | "commit") => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      if (hash) form.append("content_hash", hash);
      const response = await fetch("/my-app-server/import_members.php", { method: "POST", credentials: "include", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");
      setRows(data.rows || []);
      if (mode === "preview") {
        setHash(data.content_hash);
        toast.success(`Preview ready: ${data.valid_rows} valid, ${data.invalid_rows} invalid.`);
      } else {
        setCommitted(true);
        setConfirming(false);
        setReused(Boolean(data.idempotent));
        toast.success(data.idempotent ? "This file was already committed; existing results were loaded." : "Member invitations created.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setFile(null); setHash(""); setRows([]); setCommitted(false); setConfirming(false); setReused(false); onClose();
  };
  const results = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    save("imscca-member-invitations.csv", ["line,school_id,email,status,activation_link,error", ...rows.map((row) => [row.line, row.school_id, row.email, row.status, row.activation_link, row.error].map(escape).join(","))].join("\r\n"), "text/csv");
  };

  return <Modal dismissible show={open} onClose={close} size="5xl">
    <Modal.Header className="dark:bg-gray-800">Import member invitations</Modal.Header>
    <Modal.Body className="dark:bg-gray-800">
      <div className="space-y-4 text-gray-900 dark:text-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">Import creates identity-bound invitations, not active accounts. Valid rows are committed and invalid rows are skipped.</p>
          <button onClick={() => save("imscca-member-template.csv", "\uFEFF" + headers, "text/csv;charset=utf-8")} className={secondaryButton}>Download template</button>
        </div>
        <label className="block text-sm font-medium">UTF-8 CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] || null); setRows([]); setHash(""); setCommitted(false); }} className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-800 dark:text-gray-200 dark:file:bg-gray-700 dark:file:text-gray-100" /></label>
        {rows.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(summary).map(([key, value]) => <div key={key} className="rounded border border-gray-200 p-3 dark:border-gray-600"><span className="block text-xs capitalize text-gray-600 dark:text-gray-300">{key}</span><strong>{value}</strong></div>)}</div>}
        <div className="max-h-96 overflow-auto rounded border border-gray-200 dark:border-gray-600" tabIndex={0} aria-label="Import preview">
          <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-100"><tr>{["Line", "School ID", "Email", "Status", "Error"].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.line} className="border-t border-gray-200 dark:border-gray-600"><td className="p-2">{row.line}</td><td className="p-2">{row.school_id || row.data?.school_id}</td><td className="p-2">{row.email || row.data?.email}</td><td className="p-2">{row.status || (row.valid ? "valid" : "invalid")}</td><td className="p-2 text-red-700 dark:text-red-300">{row.error || row.errors?.join("; ")}</td></tr>)}</tbody></table>
          {!rows.length && <p className="p-6 text-center text-sm text-gray-600 dark:text-gray-300">Choose a file and preview it before committing.</p>}
        </div>
        {reused && <p className="rounded bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">This exact file was already imported. No duplicate invitations were created.</p>}
      </div>
    </Modal.Body>
    <Modal.Footer className="dark:bg-gray-800">
      {!hash ? <button disabled={!file || busy} onClick={() => void send("preview")} className="rounded bg-primary-600 px-4 py-2 text-white disabled:opacity-50">{busy ? "Checking..." : "Preview"}</button> : !committed && <button disabled={busy || summary.valid === 0} onClick={() => setConfirming(true)} className="rounded bg-primary-600 px-4 py-2 text-white disabled:opacity-50">Commit {summary.valid} valid invitation{summary.valid === 1 ? "" : "s"}</button>}
      {committed && <button className={secondaryButton} onClick={results}>Download results CSV</button>}
      <button className={secondaryButton} onClick={close}>Close</button>
    </Modal.Footer>
    {confirming && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"><div role="dialog" aria-modal="true" aria-labelledby="import-confirm-title" className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"><h2 id="import-confirm-title" className="text-lg font-semibold">Create member invitations?</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{summary.valid} valid rows will create invitations. {summary.invalid} invalid rows will be skipped.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirming(false)} className={secondaryButton}>Cancel</button><button disabled={busy} onClick={() => void send("commit")} className="rounded bg-primary-600 px-4 py-2 text-white disabled:opacity-50">{busy ? "Creating..." : "Confirm import"}</button></div></div></div>}
  </Modal>;
}
