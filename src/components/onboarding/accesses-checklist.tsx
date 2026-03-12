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

const NEUROID_BM_ID = "1100898224148253";
const NEUROID_EMAIL = "admin@neuroidmedia.com";

// Grouped by platform for clear structure
const META_ITEMS = [
  {
    key: "metaAdAccountAccess" as const,
    label: "Ad Account Access",
    description: `Share your ad account access to our BM ID: ${NEUROID_BM_ID}`,
  },
  {
    key: "metaPageAccess" as const,
    label: "Facebook & Instagram Page Access",
    description: `Share your Facebook Page and Instagram Page access to our BM ID: ${NEUROID_BM_ID}`,
  },
];

const GOOGLE_ITEMS = [
  {
    key: "googleAdsAccess" as const,
    label: "Google Ads — Accept Partner Request",
    description: "We'll send a partner link request to your Google Ads account. Please accept it when you receive it.",
  },
  {
    key: "googleAnalyticsAccess" as const,
    label: "Google Analytics (GA4) Access",
    description: `Add ${NEUROID_EMAIL} as an Admin user in your GA4 property`,
  },
  {
    key: "googleSearchConsole" as const,
    label: "Google Tag Manager (GTM) Access",
    description: `Add ${NEUROID_EMAIL} as a user with Admin access in GTM`,
  },
];

const SHOPIFY_ITEMS = [
  {
    key: "shopifyAccess" as const,
    label: "Shopify — Accept Collaborator Request",
    description: "Our onboarding manager will send a collaborator request to access your Shopify store backend. Please accept it when you receive it.",
  },
];

const OTHER_ITEMS = [
  {
    key: "websiteAccess" as const,
    label: "Google Merchant Centre (GMC) Access",
    description: `Add ${NEUROID_EMAIL} as an Admin user in your Google Merchant Centre`,
  },
];

type AccessKey = typeof META_ITEMS[number]["key"] | typeof GOOGLE_ITEMS[number]["key"] | typeof SHOPIFY_ITEMS[number]["key"] | typeof OTHER_ITEMS[number]["key"];

const ALL_ITEMS = [...META_ITEMS, ...GOOGLE_ITEMS, ...SHOPIFY_ITEMS, ...OTHER_ITEMS];

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

  function toggleAccess(key: AccessKey) {
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

  const completedCount = ALL_ITEMS.filter(
    (item) => accesses[item.key]
  ).length;
  const totalCount = ALL_ITEMS.length;

  function CheckItem({ itemKey, label, description }: { itemKey: AccessKey; label: string; description: string }) {
    const checked = accesses[itemKey] as boolean;
    return (
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
          checked
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
        }`}
      >
        <div className="mt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleAccess(itemKey)}
            className="sr-only"
          />
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
              checked
                ? "border-emerald-500 bg-emerald-500"
                : "border-gray-300 bg-white"
            }`}
          >
            {checked && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <span className={`text-sm font-medium ${checked ? "text-emerald-800" : "text-gray-900"}`}>
            {label}
          </span>
          <p className={`mt-0.5 text-xs ${checked ? "text-emerald-600" : "text-gray-500"}`}>
            {description}
          </p>
        </div>
      </label>
    );
  }

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

      <div className="space-y-6">
        {/* ─── Meta / Facebook / Instagram ─── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100">
              <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0022 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Meta (Facebook & Instagram)</h3>
          </div>

          {/* Neuroid BM ID - info display */}
          <div className="mb-3 rounded-lg border-2 border-[#F5C518]/40 bg-gradient-to-r from-[#F5C518]/10 to-transparent p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F5C518] text-[#1a1a2e]">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900">
                  Our Business Manager ID
                  <span className="ml-2 rounded-full bg-[#F5C518] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1a1a2e]">Important</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Please share access to your ad account, Facebook page, Instagram page, catalogues &amp; pixel to our BM:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-mono font-bold text-gray-900 select-all">{NEUROID_BM_ID}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(NEUROID_BM_ID)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {META_ITEMS.map((item) => (
              <CheckItem key={item.key} itemKey={item.key} label={item.label} description={item.description} />
            ))}
          </div>
        </div>

        {/* ─── Google ─── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100">
              <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.97 2.35-2.05 3.07l3.32 2.58c1.93-1.78 3.05-4.41 3.05-7.52 0-.57-.05-1.12-.15-1.64l-.5-.22z"/><path d="M12.17 22c2.73 0 5.02-.9 6.7-2.47l-3.32-2.58c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.17v2.67A10.02 10.02 0 0012.17 22z"/><path d="M6.58 13.8A6 6 0 016.25 12c0-.62.11-1.22.3-1.8V7.53H3.17A10 10 0 002.17 12c0 1.62.39 3.15 1.07 4.5l3.34-2.7z"/><path d="M12.17 5.88c1.47 0 2.78.5 3.82 1.5l2.85-2.85C17.15 2.99 14.87 2 12.17 2A10.02 10.02 0 003.17 7.53l3.41 2.67c.79-2.36 2.99-4.32 5.59-4.32z"/></svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Google</h3>
          </div>

          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">For GA4, GTM &amp; GMC:</span> Please add <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono font-bold select-all">{NEUROID_EMAIL}</code> as an Admin user.
            </p>
          </div>

          <div className="space-y-2">
            {GOOGLE_ITEMS.map((item) => (
              <CheckItem key={item.key} itemKey={item.key} label={item.label} description={item.description} />
            ))}
          </div>
        </div>

        {/* ─── Shopify ─── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100">
              <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M15.34 3.27c-.07 0-.13.04-.16.1-.03.06-1.01 1.94-1.01 1.94s-.96-.27-1.06-.3c-.1-.03-.16-.01-.2.06s-1.1 2.14-1.1 2.14l-1.54-.41s-.1-.03-.15.04c-.06.07-.82 1.02-.82 1.02l-.11-.03c-.04-.01-.08.01-.1.05L8 10.6v.05l3.97 1.06.02-.01 3.8-8.34c.03-.07 0-.1-.07-.1h-.01l-.37.01zM12.58 5.27l-.89 2.75-.01.03-1.72-.46 1.72-2.64.9.32zm-.97-1.18l-1.94 2.98-1.37-.37 1.95-2.41 1.36-.2zm2.17.98l-.84 2.6-1.67-.45.86-1.66.82-.23.83-.26zm-.88-.75l-.71.2-.76.22.74-1.43.73.01v1zm-4.39 3.7l1.52.41.32.08-.62.72-1.22-.22v-.99zm6.73 5.14l-.01-.14c-.01-.1-.11-1.59-.11-1.59l-.82.04s-.52-.46-.52-.46l-.57 2.97 2.03-.82zm-2.5-2.3l.6.53.04.03.01.14.09 1.33-1.49.6.75-2.63zm-2.94 2.74l1.38.37-.93 2.88-1.38-.37.93-2.88zm1.6.43l1.37.37-.93 2.88-1.37-.37.93-2.88zm-.29-4.91l1.85.5-.88 2.73-1.85-.5.88-2.73z"/></svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Shopify</h3>
          </div>

          <div className="mb-3 rounded-lg border border-green-100 bg-green-50/50 p-3">
            <p className="text-xs text-green-700">
              Thank you for sharing your collaborator code! Our onboarding manager will send a collaborator request to your Shopify store. Just accept it when it arrives.
            </p>
          </div>

          <div className="space-y-2">
            {SHOPIFY_ITEMS.map((item) => (
              <CheckItem key={item.key} itemKey={item.key} label={item.label} description={item.description} />
            ))}
          </div>
        </div>

        {/* ─── Google Merchant Centre ─── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100">
              <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Other Platforms</h3>
          </div>

          <div className="space-y-2">
            {OTHER_ITEMS.map((item) => (
              <CheckItem key={item.key} itemKey={item.key} label={item.label} description={item.description} />
            ))}
          </div>
        </div>

        {/* Other accesses / notes */}
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
