"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OperatorForm from "@/components/OperatorForm";

export default function NewOperatorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (yaml: string) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yaml }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setError(data.errors.map((e: { message: string }) => e.message).join(", "));
        } else {
          setError(data.error || "Failed to create operator");
        }
        return;
      }

      router.push("/");
    } catch {
      setError("Failed to create operator");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Operator</h1>
        <Link
          href="/"
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <OperatorForm isNew={true} onSave={handleSave} saving={saving} />
      </div>
    </div>
  );
}
