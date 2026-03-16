import { NextRequest, NextResponse } from "next/server";

// Serve files from /tmp fallback storage
export async function GET(req: NextRequest) {
  const fileName = req.nextUrl.searchParams.get("file");
  if (!fileName) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  // Sanitize filename to prevent path traversal
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `/tmp/neuroflo-uploads/${safeName}`;

  try {
    const { readFile } = await import("fs/promises");
    const buffer = await readFile(filePath);

    // Guess content type
    const ext = safeName.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
      txt: "text/plain",
      zip: "application/zip",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
