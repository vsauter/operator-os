import ReactMarkdown from "react-markdown";

interface BriefingOutputProps {
  content: string;
}

export default function BriefingOutput({ content }: BriefingOutputProps) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="prose max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
