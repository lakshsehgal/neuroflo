"use client";

import { useState, useTransition } from "react";
import { submitOnboardingForm } from "@/actions/onboarding";

type OnboardingData = {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  authorisedSignatory: string | null;
  gstin: string | null;
  legalCompanyName: string | null;
};

interface Props {
  token: string;
  clientName: string;
  existing?: OnboardingData | null;
  isResubmit?: boolean;
}

export function OnboardingForm({ token, clientName, existing, isResubmit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(!isResubmit);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    contactName: existing?.contactName || "",
    contactEmail: existing?.contactEmail || "",
    contactPhone: existing?.contactPhone || "",
    authorisedSignatory: existing?.authorisedSignatory || "",
    gstin: existing?.gstin || "",
    legalCompanyName: existing?.legalCompanyName || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.contactName.trim() || !form.contactEmail.trim()) {
      setError("Name and Email are required.");
      return;
    }

    startTransition(async () => {
      const result = await submitOnboardingForm(token, {
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        authorisedSignatory: form.authorisedSignatory.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        legalCompanyName: form.legalCompanyName.trim() || undefined,
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
      <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-green-800">
          {isResubmit ? "Details Updated!" : "Thank You!"}
        </h2>
        <p className="mt-1 text-sm text-green-700">
          Your onboarding details have been {isResubmit ? "updated" : "submitted"} successfully. Our team will be in touch shortly.
        </p>
      </div>
    );
  }

  if (isResubmit && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50"
      >
        Update Details
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${isResubmit ? "mt-6" : ""}`}>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
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
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Company Details</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Authorised Signatory</label>
            <input
              type="text"
              value={form.authorisedSignatory}
              onChange={(e) => setForm({ ...form, authorisedSignatory: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Name of authorised signatory"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">GSTIN</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Legal Name of Company</label>
            <input
              type="text"
              value={form.legalCompanyName}
              onChange={(e) => setForm({ ...form, legalCompanyName: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Company Pvt. Ltd."
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Submitting..." : isResubmit ? "Update Details" : "Submit"}
      </button>
    </form>
  );
}
