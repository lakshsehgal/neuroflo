"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, CheckCircle } from "lucide-react";

interface FileUpload {
  file: File;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileUpload[]>([]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileUpload[] = selectedFiles.map((f) => ({
      file: f,
      name: f.name,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: FileUpload[] = droppedFiles.map((f) => ({
      file: f,
      name: f.name,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Assets</h1>
        <p className="text-muted-foreground">Upload files to your asset library</p>
      </div>

      {/* Drop zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center hover:border-muted-foreground/50 transition-colors"
          >
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Drag and drop files here</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
            <Label htmlFor="file-input" className="mt-4">
              <Button variant="outline" asChild>
                <span>Browse Files</span>
              </Button>
            </Label>
            <Input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selected Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(f.file.size)} &middot; {f.file.type || "unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {f.status === "done" && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {f.status === "pending" && (
                      <Button size="icon" variant="ghost" onClick={() => removeFile(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button disabled={files.length === 0}>
                Upload {files.length} File{files.length !== 1 ? "s" : ""}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
