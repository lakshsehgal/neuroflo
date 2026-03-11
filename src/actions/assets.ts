"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { generateUploadUrl, generateDownloadUrl, deleteObject, getS3Key } from "@/lib/s3";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { AssetType } from "@prisma/client";

export async function getUploadPresignedUrl(
  fileName: string,
  mimeType: string
): Promise<ActionResponse<{ url: string; key: string }>> {
  await requireRole("MEMBER");

  const assetId = crypto.randomUUID();
  const key = getS3Key(null, assetId, 1, fileName);
  const url = await generateUploadUrl(key, mimeType);

  return { success: true, data: { url, key } };
}

const createAssetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "OTHER"]),
  s3Key: z.string(),
  s3Url: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createAsset(
  input: z.infer<typeof createAssetSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MEMBER");

  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const { tags, ...data } = parsed.data;

  const asset = await db.asset.create({
    data: {
      ...data,
      uploadedById: user.id,
      tags: tags?.length
        ? {
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : undefined,
      versions: {
        create: {
          version: 1,
          s3Key: data.s3Key,
          s3Url: data.s3Url,
          fileSize: data.fileSize,
          uploadedById: user.id,
          changeNote: "Initial upload",
        },
      },
    },
  });

  revalidatePath("/assets");
  return { success: true, data: { id: asset.id } };
}

export async function getAssets(filters?: {
  type?: AssetType;
  folderId?: string;
  tag?: string;
  search?: string;
}) {
  await requireAuth();

  return db.asset.findMany({
    where: {
      ...(filters?.type && { type: filters.type }),
      ...(filters?.folderId && { folderId: filters.folderId }),
      ...(filters?.tag && { tags: { some: { name: filters.tag } } }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { description: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    },
    include: {
      uploadedBy: { select: { name: true } },
      tags: { select: { name: true } },
      folder: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAsset(id: string) {
  await requireAuth();

  return db.asset.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      tags: true,
      folder: true,
      versions: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { version: "desc" },
      },
    },
  });
}

export async function getAssetDownloadUrl(
  assetId: string
): Promise<ActionResponse<{ url: string }>> {
  await requireAuth();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { success: false, error: "Asset not found" };

  const url = await generateDownloadUrl(asset.s3Key);
  return { success: true, data: { url } };
}

export async function deleteAsset(id: string): Promise<ActionResponse> {
  await requireRole("MANAGER");

  const asset = await db.asset.findUnique({
    where: { id },
    include: { versions: true },
  });
  if (!asset) return { success: false, error: "Asset not found" };

  // Delete all versions from S3
  for (const version of asset.versions) {
    await deleteObject(version.s3Key);
  }
  await deleteObject(asset.s3Key);

  await db.asset.delete({ where: { id } });
  revalidatePath("/assets");
  return { success: true };
}

export async function getFolders(parentId?: string) {
  await requireAuth();

  return db.assetFolder.findMany({
    where: { parentId: parentId || null },
    include: { _count: { select: { assets: true, children: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createFolder(
  name: string,
  parentId?: string
): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.assetFolder.create({ data: { name, parentId } });
  revalidatePath("/assets");
  return { success: true };
}
