"use client";

import { useState, useTransition, useRef } from "react";
import { submitOnboardingForm, getGstCertificateUploadUrl } from "@/actions/onboarding";

type OnboardingData = {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  authorisedSignatory: string | null;
  gstin: string | null;
  legalCompanyName: string | null;
  shopifyCollaboratorCode: string | null;
  googleAdAccountId: string | null;
  gstCertificateUrl: string | null;
};

interface Props {
  token: string;
  clientName: string;
  existing?: OnboardingData | null;
  hasGoogleAds?: boolean;
  isResubmit?: boolean;
}

export function OnboardingForm({ token, clientName, existing, hasGoogleAds, isResubmit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(!isResubmit);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gstFileName, setGstFileName] = useState<string | null>(
    existing?.gstCertificateUrl ? "Certificate uploaded" : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    contactName: existing?.contactName || "",
    contactEmail: existing?.contactEmail || "",
    contactPhone: existing?.contactPhone || "",
    authorisedSignatory: existing?.authorisedSignatory || "",
    gstin: existing?.gstin || "",
    legalCompanyName: existing?.legalCompanyName || "",
    shopifyCollaboratorCode: existing?.shopifyCollaboratorCode || "",
    googleAdAccountId: existing?.googleAdAccountId || "",
    gstCertificateUrl: existing?.gstCertificateUrl || "",
  });

  async function handleGstUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF or image file (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be smaller than 10MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await getGstCertificateUploadUrl(token, file.name, file.type);
      if (!result.success || !result.data) {
        setError("Failed to prepare upload. Please try again.");
        setUploading(false);
        return;
      }

      const { uploadUrl, key } = result.data;

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        setError("Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      setForm((prev) => ({ ...prev, gstCertificateUrl: key }));
      setGstFileName(file.name);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.contactName.trim() || !form.contactEmail.trim()) {
      setError("Name and Email are required.");
      return;
    }

    if (hasGoogleAds && form.googleAdAccountId.trim()) {
      const digits = form.googleAdAccountId.replace(/\D/g, "");
      if (digits.length !== 10) {
        setError("Google Ad Account ID must be a 10-digit number.");
        return;
      }
    }

    startTransition(async () => {
      const result = await submitOnboardingForm(token, {
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        authorisedSignatory: form.authorisedSignatory.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        legalCompanyName: form.legalCompanyName.trim() || undefined,
        shopifyCollaboratorCode: form.shopifyCollaboratorCode.trim() || undefined,
        googleAdAccountId: hasGoogleAds ? form.googleAdAccountId.trim() || undefined : undefined,
        gstCertificateUrl: form.gstCertificateUrl || undefined,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-emerald-800">
          {isResubmit ? "Details Updated!" : "Thank You!"}
        </h2>
        <p className="mt-1 text-sm text-emerald-700">
          Your onboarding details have been {isResubmit ? "updated" : "submitted"} successfully.
          {!isResubmit && " Please scroll down to complete the accesses checklist."}
        </p>
      </div>
    );
  }

  if (isResubmit && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Update Details
      </button>
    );
  }

  const inputClass =
    "block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20";

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${isResubmit ? "mt-6" : ""}`}>
      {/* Contact Details */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-bold text-[#1a1a2e]">1</span>
          Contact Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              required
              className={inputClass}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-500">(Agreement/invoice will be sent here)</span>
            </label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              required
              className={inputClass}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className={inputClass}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-bold text-[#1a1a2e]">2</span>
          Company Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Authorised Signatory</label>
            <input
              type="text"
              value={form.authorisedSignatory}
              onChange={(e) => setForm({ ...form, authorisedSignatory: e.target.value })}
              className={inputClass}
              placeholder="Name of authorised signatory"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Legal Name of Company</label>
            <input
              type="text"
              value={form.legalCompanyName}
              onChange={(e) => setForm({ ...form, legalCompanyName: e.target.value })}
              className={inputClass}
              placeholder="Company Pvt. Ltd."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">GSTIN</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className={inputClass}
              placeholder="22AAAAA0000A1Z5"
            />
          </div>

          {/* GST Certificate Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              GST Certificate
              <span className="ml-1 text-xs font-normal text-gray-500">(Optional — PDF or image)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleGstUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {gstFileName ? "Replace File" : "Upload Certificate"}
                  </>
                )}
              </button>
              {gstFileName && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {gstFileName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Platform Details */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-bold text-[#1a1a2e]">3</span>
          Platform Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Shopify Collaborator Code</label>
            <input
              type="text"
              value={form.shopifyCollaboratorCode}
              onChange={(e) => setForm({ ...form, shopifyCollaboratorCode: e.target.value })}
              className={inputClass}
              placeholder="Enter your Shopify collaborator code"
            />
          </div>

          {hasGoogleAds && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Google Ad Account ID
                <span className="ml-1 text-xs font-normal text-gray-500">(10-digit number)</span>
              </label>
              <input
                type="text"
                value={form.googleAdAccountId}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, googleAdAccountId: val });
                }}
                className={inputClass}
                placeholder="123 456 7890"
                maxLength={10}
              />
              {form.googleAdAccountId && form.googleAdAccountId.length > 0 && form.googleAdAccountId.length < 10 && (
                <p className="mt-1 text-xs text-amber-600">{10 - form.googleAdAccountId.length} more digits needed</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || uploading}
        className="w-full rounded-lg bg-[#1a1a2e] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#2a2a4e] hover:shadow-lg disabled:opacity-50"
      >
        {isPending ? "Submitting..." : isResubmit ? "Update Details" : "Submit"}
      </button>
    </form>
  );
}
