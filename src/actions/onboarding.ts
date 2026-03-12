"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import type { ActionResponse } from "@/types";

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
      onboarding: true,
    },
  });

  return client;
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
    },
    update: {
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || null,
      authorisedSignatory: data.authorisedSignatory || null,
      gstin: data.gstin || null,
      legalCompanyName: data.legalCompanyName || null,
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
