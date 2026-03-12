"use client";

import { useState, useTransition } from "react";
import { submitAccessesChecklist } from "@/actions/onboarding";

type AccessesData = {
  metaBmId: string | null;
  metaPageAccess: boolean;
  metaAdAccountAccess: boolean;
  googleAdsAccess: boolean;
  googleAnalyticsAccess: boolean;
  googleSearchConsole: boolean;
  shopifyAccess: boolean;
  websiteAccess: boolean;
  otherAccesses: string | null;
};

interface Props {
  token: string;
  existing: AccessesData | null;
}

const ACCESS_ITEMS = [
  {
    key: "metaPageAccess" as const,
    label: "Meta (Facebook/Instagram) Page Access",
    description: "Add us as a partner on your Meta Business Suite",
  },
  {
    key: "metaAdAccountAccess" as const,
    label: "Meta Ad Account Access",
    description: "Share ad account access via Meta Business Manager",
  },
  {
    key: "googleAdsAccess" as const,
    label: "Google Ads Access",
    description: "Grant manager access to your Google Ads account",
  },
  {
    key: "googleAnalyticsAccess" as const,
    label: "Google Analytics Access",
    description: "Add us as an editor on your GA4 property",
  },
  {
    key: "googleSearchConsole" as const,
    label: "Google Search Console Access",
    description: "Add us as a full user on Search Console",
  },
  {
    key: "shopifyAccess" as const,
    label: "Shopify Store Access",
    description: "Accept our collaborator request on your Shopify store",
  },
  {
    key: "websiteAccess" as const,
    label: "Website / CMS Access",
    description: "Share login credentials or invite us to your CMS",
  },
];

export function AccessesChecklist({ token, existing }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accesses, setAccesses] = useState({
    metaBmId: existing?.metaBmId || "",
    metaPageAccess: existing?.metaPageAccess || false,
    metaAdAccountAccess: existing?.metaAdAccountAccess || false,
    googleAdsAccess: existing?.googleAdsAccess || false,
    googleAnalyticsAccess: existing?.googleAnalyticsAccess || false,
    googleSearchConsole: existing?.googleSearchConsole || false,
    shopifyAccess: existing?.shopifyAccess || false,
    websiteAccess: existing?.websiteAccess || false,
    otherAccesses: existing?.otherAccesses || "",
  });

  function toggleAccess(key: keyof typeof accesses) {
    setAccesses((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await submitAccessesChecklist(token, {
        metaBmId: accesses.metaBmId.trim() || undefined,
        metaPageAccess: accesses.metaPageAccess,
        metaAdAccountAccess: accesses.metaAdAccountAccess,
        googleAdsAccess: accesses.googleAdsAccess,
        googleAnalyticsAccess: accesses.googleAnalyticsAccess,
        googleSearchConsole: accesses.googleSearchConsole,
        shopifyAccess: accesses.shopifyAccess,
        websiteAccess: accesses.websiteAccess,
        otherAccesses: accesses.otherAccesses.trim() || undefined,
      });

      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error || "Failed to save. Please try again.");
      }
    });
  }

  const completedCount = ACCESS_ITEMS.filter(
    (item) => accesses[item.key]
  ).length + (accesses.metaBmId.trim() ? 1 : 0);
  const totalCount = ACCESS_ITEMS.length + 1; // +1 for Meta BM ID

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5C518] text-xs font-bold text-[#1a1a2e]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </span>
            Platform Accesses
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Please grant us access to the following platforms to get started
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-2xl font-bold text-[#B8930E]">{completedCount}</span>
            <span className="text-sm text-gray-400">/{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F5C518] to-[#E0AE0D] transition-all duration-500"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {/* Meta Business Manager ID — highlighted */}
        <div className="rounded-lg border-2 border-[#F5C518]/40 bg-gradient-to-r from-[#F5C518]/10 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F5C518] text-[#1a1a2e]">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900">
                Meta Business Manager ID
                <span className="ml-2 rounded-full bg-[#F5C518] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1a1a2e]">Important</span>
              </label>
              <p className="mt-0.5 text-xs text-gray-500">
                Find this in Business Settings &rarr; Business Info. It&apos;s a numeric ID.
              </p>
              <input
                type="text"
                value={accesses.metaBmId}
                onChange={(e) => {
                  setAccesses((prev) => ({ ...prev, metaBmId: e.target.value }));
                  setSaved(false);
                }}
                className="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
                placeholder="Enter your Meta Business Manager ID"
              />
            </div>
          </div>
        </div>

        {/* Access checklist items */}
        {ACCESS_ITEMS.map((item) => (
          <label
            key={item.key}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
              accesses[item.key]
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
            }`}
          >
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={accesses[item.key] as boolean}
                onChange={() => toggleAccess(item.key)}
                className="sr-only"
              />
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                  accesses[item.key]
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-gray-300 bg-white"
                }`}
              >
                {accesses[item.key] && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <span className={`text-sm font-medium ${accesses[item.key] ? "text-emerald-800" : "text-gray-900"}`}>
                {item.label}
              </span>
              <p className={`mt-0.5 text-xs ${accesses[item.key] ? "text-emerald-600" : "text-gray-500"}`}>
                {item.description}
              </p>
            </div>
          </label>
        ))}

        {/* Other accesses */}
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Other Accesses / Notes
          </label>
          <textarea
            value={accesses.otherAccesses}
            onChange={(e) => {
              setAccesses((prev) => ({ ...prev, otherAccesses: e.target.value }));
              setSaved(false);
            }}
            rows={3}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
            placeholder="Any additional platform accesses or notes..."
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#2a2a4e] hover:shadow-lg disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Accesses"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
