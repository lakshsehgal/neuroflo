"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import type { ActionResponse } from "@/types";
import { generateUploadUrl, generateDownloadUrl } from "@/lib/s3";

// Generate onboarding token for a client
export async function generateOnboardingToken(
  clientId: string
): Promise<ActionResponse<{ token: string }>> {
  await requireRole("ADMIN");

  const token = randomBytes(24).toString("hex");

  await db.client.update({
    where: { id: clientId },
    data: {
      onboardingToken: token,
      onboardingsentAt: new Date(),
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return { success: true, data: { token } };
}

// Get onboarding data for a client (admin view)
export async function getClientOnboarding(clientId: string) {
  await requireRole("ADMIN");

  return db.clientOnboarding.findUnique({
    where: { clientId },
  });
}

// Get client by onboarding token (public — no auth needed)
export async function getClientByOnboardingToken(token: string) {
  const client = await db.client.findUnique({
    where: { onboardingToken: token },
    select: {
      id: true,
      name: true,
      contactName: true,
      sow: true,
      onboarding: true,
    },
  });

  return client;
}

// Generate presigned upload URL for GST certificate (public — no auth needed)
export async function getGstCertificateUploadUrl(
  token: string,
  fileName: string,
  contentType: string
): Promise<ActionResponse<{ uploadUrl: string; key: string }>> {
  const client = await db.client.findUnique({
    where: { onboardingToken: token },
    select: { id: true },
  });

  if (!client) {
    return { success: false, error: "Invalid onboarding link" };
  }

  const key = `onboarding/${client.id}/gst-certificate/${Date.now()}-${fileName}`;
  const uploadUrl = await generateUploadUrl(key, contentType, 10 * 1024 * 1024); // 10MB

  return { success: true, data: { uploadUrl, key } };
}

// Get presigned download URL for GST certificate
export async function getGstCertificateDownloadUrl(
  key: string
): Promise<string> {
  return generateDownloadUrl(key, 3600);
}

// Submit onboarding form (public — no auth needed)
export async function submitOnboardingForm(
  token: string,
  data: {
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    authorisedSignatory?: string;
    gstin?: string;
    legalCompanyName?: string;
    shopifyCollaboratorCode?: string;
    googleAdAccountId?: string;
    gstCertificateUrl?: string;
  }
): Promise<ActionResponse> {
  const client = await db.client.findUnique({
    where: { onboardingToken: token },
    select: { id: true },
  });

  if (!client) {
    return { success: false, error: "Invalid or expired onboarding link" };
  }

  // Upsert the onboarding data
  await db.clientOnboarding.upsert({
    where: { clientId: client.id },
    create: {
      clientId: client.id,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || null,
      authorisedSignatory: data.authorisedSignatory || null,
      gstin: data.gstin || null,
      legalCompanyName: data.legalCompanyName || null,
      shopifyCollaboratorCode: data.shopifyCollaboratorCode || null,
      googleAdAccountId: data.googleAdAccountId || null,
      gstCertificateUrl: data.gstCertificateUrl || null,
    },
    update: {
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || null,
      authorisedSignatory: data.authorisedSignatory || null,
      gstin: data.gstin || null,
      legalCompanyName: data.legalCompanyName || null,
      shopifyCollaboratorCode: data.shopifyCollaboratorCode || null,
      googleAdAccountId: data.googleAdAccountId || null,
      gstCertificateUrl: data.gstCertificateUrl || null,
      submittedAt: new Date(),
    },
  });

  // Also update the client's contact info
  await db.client.update({
    where: { id: client.id },
    data: {
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || undefined,
    },
  });

  return { success: true };
}

// Submit accesses checklist (public — no auth needed)
export async function submitAccessesChecklist(
  token: string,
  data: {
    metaBmId?: string;
    metaPageAccess: boolean;
    metaAdAccountAccess: boolean;
    googleAdsAccess: boolean;
    googleAnalyticsAccess: boolean;
    googleSearchConsole: boolean;
    shopifyAccess: boolean;
    websiteAccess: boolean;
    otherAccesses?: string;
  }
): Promise<ActionResponse> {
  const client = await db.client.findUnique({
    where: { onboardingToken: token },
    select: { id: true },
  });

  if (!client) {
    return { success: false, error: "Invalid or expired onboarding link" };
  }

  await db.clientOnboarding.update({
    where: { clientId: client.id },
    data: {
      metaBmId: data.metaBmId || null,
      metaPageAccess: data.metaPageAccess,
      metaAdAccountAccess: data.metaAdAccountAccess,
      googleAdsAccess: data.googleAdsAccess,
      googleAnalyticsAccess: data.googleAnalyticsAccess,
      googleSearchConsole: data.googleSearchConsole,
      shopifyAccess: data.shopifyAccess,
      websiteAccess: data.websiteAccess,
      otherAccesses: data.otherAccesses || null,
    },
  });

  return { success: true };
}
