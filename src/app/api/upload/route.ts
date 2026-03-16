import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Server-side upload handler — avoids all S3 CORS issues
// Accepts FormData with a "file" field and optional "folder" field
// Tries S3 first; falls back to base64 data URL for images under 2MB
export async function POST(req: NextRequest) {
  // Check auth (allow unauthenticated for onboarding with token)
  const folder = req.nextUrl.searchParams.get("folder") || "uploads";
  const isOnboarding = folder === "onboarding";

  if (!isOnboarding) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const contentType = file.type;
    const fileSize = file.size;

    // Try S3 upload
    const s3Result = await tryS3Upload(buffer, fileName, contentType, folder);
    if (s3Result) {
      return NextResponse.json({
        url: s3Result,
        fileName,
        fileType: contentType,
        fileSize,
      });
    }

    // Fallback: base64 data URL (for images under 2MB)
    if (contentType.startsWith("image/") && fileSize <= 2 * 1024 * 1024) {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;
      return NextResponse.json({
        url: dataUrl,
        fileName,
        fileType: contentType,
        fileSize,
      });
    }

    // Fallback: store in /tmp and serve via API (works on Vercel for ~10min)
    const { writeFile, mkdir } = await import("fs/promises");
    const tmpDir = "/tmp/neuroflo-uploads";
    await mkdir(tmpDir, { recursive: true });
    const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const tmpPath = `${tmpDir}/${uniqueName}`;
    await writeFile(tmpPath, buffer);

    const serveUrl = `/api/upload/serve?file=${encodeURIComponent(uniqueName)}`;
    return NextResponse.json({
      url: serveUrl,
      fileName,
      fileType: contentType,
      fileSize,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

async function tryS3Upload(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string
): Promise<string | null> {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKey || !secretKey) {
    return null;
  }

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    const key = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (err) {
    console.error("S3 upload failed:", err);
    return null;
  }
}
