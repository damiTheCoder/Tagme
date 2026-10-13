"use client";

export function ExportCsvButton({ rows }: { rows: Record<string, unknown>[] }) {
  function onExport() {
    if (rows.length === 0) return;
    const header = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) => header.map((h) => esc(r[h])).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "admin-transactions.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={rows.length === 0}
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
    >
      Export CSV
    </button>
  );
}
