"use client";

import { useState, useRef } from "react";
import {
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  FileSpreadsheet,
  File,
  Download,
  Loader2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Attachment } from "@repo/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("csv") || mimeType.includes("excel")) return FileSpreadsheet;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isImageType(mimeType: string) {
  return mimeType.startsWith("image/");
}

interface Props {
  taskId: string;
  attachments: Attachment[];
  onChanged: () => void;
}

export function AttachmentList({ taskId, attachments, onChanged }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/tasks/${taskId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success(files.length > 1 ? `${files.length} fichiers ajoutes` : "Fichier ajoute");
      onChanged();
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      await api.delete(`/tasks/attachments/${attachmentId}`);
      toast.success("Fichier supprime");
      onChanged();
    } catch {
      toast.error("Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5" />
          Pieces jointes ({attachments.length})
        </h4>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--surface-low)] px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Ajouter
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Drop zone when empty */}
      {attachments.length === 0 && !uploading && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--primary)]/40 hover:bg-[var(--surface-low)]/50 transition-colors"
        >
          <Upload className="h-5 w-5 text-[var(--muted-foreground)]" />
          <p className="text-xs text-[var(--muted-foreground)]">
            Glisser-deposer ou cliquer pour ajouter
          </p>
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimeType);
            const isImage = isImageType(att.mimeType);
            const fullUrl = `${API_URL}${att.url}`;
            const isDeleting = deletingId === att.id;

            return (
              <div
                key={att.id}
                className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors"
              >
                {/* Thumbnail or icon */}
                {isImage ? (
                  <button
                    onClick={() => setPreviewUrl(fullUrl)}
                    className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--surface-high)] shrink-0"
                  >
                    <img
                      src={fullUrl}
                      alt={att.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-high)] flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={att.filename}>{att.filename}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {formatSize(att.size)} — {att.mimeType.split("/")[1]?.toUpperCase() || "FICHIER"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={fullUrl}
                    download={att.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-high)] transition-colors"
                    title="Telecharger"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(att.id)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add more zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--primary)]/40 hover:bg-[var(--surface-low)]/50 transition-colors text-[11px] text-[var(--muted-foreground)]"
          >
            <Upload className="h-3 w-3" />
            Ajouter un fichier
          </div>
        </div>
      )}

      {/* Image preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
