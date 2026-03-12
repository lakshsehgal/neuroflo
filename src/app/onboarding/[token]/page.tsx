import { getClientByOnboardingToken } from "@/actions/onboarding";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { notFound } from "next/navigation";

export default async function OnboardingPage({
  params,
}: {
  params: { token: string };
}) {
  const client = await getClientByOnboardingToken(params.token);

  if (!client) {
    notFound();
  }

  const alreadySubmitted = !!client.onboarding;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl font-bold text-primary">N</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to NeuroFlo
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {alreadySubmitted
              ? `Thank you, ${client.name}! Your onboarding details have been submitted.`
              : `Hi ${client.name}, please fill in your details to get started with us.`}
          </p>
        </div>

        {alreadySubmitted && client.onboarding ? (
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
              token={params.token}
              clientName={client.name}
              existing={client.onboarding}
              isResubmit
            />
          </div>
        ) : (
          <OnboardingForm token={params.token} clientName={client.name} />
        )}
      </div>
    </div>
  );
}
