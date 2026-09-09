import { FolderOpen } from "lucide-react";

export default function EmptyState({ label }) {
  return (
    <div className="admin-empty-state">
      <FolderOpen size={22} />
      <span>{label}</span>
    </div>
  );
}
