"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OperatorForm from "@/components/OperatorForm";

interface EditOperatorPageProps {
  params: { id: string };
}

export default function EditOperatorPage({ params }: EditOperatorPageProps) {
  const { id } = params;
  const router = useRouter();
  const [yaml, setYaml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOperator() {
      try {
        const res = await fetch(`/api/operators/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load operator");
          return;
        }

        setYaml(data.yaml);
      } catch {
        setError("Failed to load operator");
      } finally {
        setLoading(false);
      }
    }

    fetchOperator();
  }, [id]);

  const handleSave = async (newYaml: string) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/operators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yaml: newYaml }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setError(data.errors.map((e: { message: string }) => e.message).join(", "));
        } else {
          setError(data.error || "Failed to update operator");
        }
        return;
      }

      router.push("/");
    } catch {
      setError("Failed to update operator");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-500">Loading operator...</p>
      </div>
    );
  }

  if (!yaml) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error || "Operator not found"}
        </div>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Operator</h1>
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
        <OperatorForm
          initialYaml={yaml}
          isNew={false}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
