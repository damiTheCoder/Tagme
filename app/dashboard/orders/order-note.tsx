"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateOrderNote } from "./actions";

export function OrderNote({ orderId, initialNote }: { orderId: string; initialNote: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const result = await updateOrderNote(orderId, note);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Note saved");
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    if (!initialNote) {
      return (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Add a note
        </Button>
      );
    }
    return (
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="whitespace-pre-wrap text-sm">{initialNote}</p>
        <button
          onClick={() => {
            setNote(initialNote);
            setEditing(true);
          }}
          className="mt-1 text-sm text-[#0c4a6e] hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Private note — only you can see this"
        className="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd3fc]"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : "Save note"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setNote(initialNote ?? "");
            setEditing(false);
          }}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
