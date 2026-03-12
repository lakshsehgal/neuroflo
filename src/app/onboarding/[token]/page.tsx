import { getClientByOnboardingToken } from "@/actions/onboarding";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { AccessesChecklist } from "@/components/onboarding/accesses-checklist";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await getClientByOnboardingToken(token);

  if (!client) {
    notFound();
  }

  const alreadySubmitted = !!client.onboarding;
  const firstName = (client.contactName || client.name || "").split(" ")[0];
  const hasGoogleAds = client.sow?.toLowerCase().includes("google ads") ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-white to-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <Image
              src="/neuroid-logo.svg"
              alt="Neuroid"
              width={180}
              height={44}
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to Neuroid
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {alreadySubmitted
              ? `Thank you, ${firstName}! Your onboarding details have been submitted.`
              : `Hi ${firstName}, please fill in your details to get started with us.`}
          </p>
        </div>

        {alreadySubmitted && client.onboarding ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-green-800">Onboarding Complete</h2>
              <p className="mt-1 text-sm text-green-700">
                Your details were submitted on {new Date(client.onboarding.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. If you need to update anything, you can resubmit below.
              </p>

              <OnboardingForm
                token={token}
                clientName={firstName}
                existing={client.onboarding}
                hasGoogleAds={hasGoogleAds}
                isResubmit
              />
            </div>

            {/* Accesses section - shown after form submission */}
            <AccessesChecklist
              token={token}
              existing={client.onboarding}
            />
          </div>
        ) : (
          <OnboardingForm
            token={token}
            clientName={firstName}
            hasGoogleAds={hasGoogleAds}
          />
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-medium text-gray-500">Neuroid</span>
          </p>
        </div>
      </div>
    </div>
  );
}
