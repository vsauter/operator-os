"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center bg-gray-50 border rounded">
      Loading editor...
    </div>
  ),
});

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export default function YamlEditor({ value, onChange, error }: YamlEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-gray-50 border rounded">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="border rounded overflow-hidden">
        <MonacoEditor
          height="500px"
          language="yaml"
          value={value}
          onChange={(val) => onChange(val || "")}
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
