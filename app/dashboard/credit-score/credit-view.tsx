"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { Gauge } from "@/components/dashboard/gauge";
import { LazyAssistantBar as AssistantBar } from "@/components/dashboard/assistant/assistant-bar-lazy";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateCreditConsent, type CreditSummary } from "./actions";
import type { Business } from "@/lib/auth";

function formatLimit(limit: number): string {
  if (limit <= 0) return "—";
  return `₦${limit.toLocaleString()}`;
}

/** 1-decimal precision, hiding ".0" (round1 values carry at most 1 decimal). */
function formatPoints(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(1);
}

function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // No backend yet: local confirmation only. Nothing is stored or sent.
    setDone(true);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), setDone(false))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join the financing waitlist</DialogTitle>
          <DialogDescription>
            Leave your details and we&apos;ll reach out when financing opens.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
            You&apos;re on the list — we&apos;ll be in touch.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              required
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit">Notify me</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreditView({
  summary,
  business,
}: {
  summary: CreditSummary;
  business: Business;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(summary.consent);
  const [savingConsent, setSavingConsent] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  async function onToggleConsent(next: boolean) {
    setConsent(next);
    setSavingConsent(true);
    const result = await updateCreditConsent(next);
    setSavingConsent(false);
    if (!result.ok) {
      setConsent(!next);
      toast.error(result.error);
      return;
    }
    toast.success(next ? "Score enabled" : "Score hidden");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit score"
        description="Built from your verified sales activity"
      />
      <p className="-mt-3 text-xs text-gray-500">Updated automatically as you sell.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-2">
            <Gauge value={summary.score} label="Out of 100" icon={Award} />
            <p className="mt-1 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {summary.tier}
            </p>
            <div className="mt-1 flex items-center justify-center text-xs">
              {summary.scoreDelta > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                  <TrendingUp size={14} /> +{formatPoints(summary.scoreDelta)} since last week
                </span>
              ) : summary.scoreDelta < 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                  <TrendingDown size={14} /> {formatPoints(summary.scoreDelta)} since last week
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Minus size={14} /> No change in the last 7 days
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ask about your credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-gray-500">
              Chat with the AI about your score, what drives it, or whether a
              loan fits your sales — e.g. “If I borrow ₦300,000, can I pay it
              back?”
            </p>
            <AssistantBar business={business} showSuggestions={false} />
            <p className="mt-3 text-xs text-gray-500">
              Financing is provided by licensed lending partners. Tagly
              provides the score. You choose what to share.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {summary.eligible ? "You may qualify" : "Not yet eligible"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {summary.eligible ? (
            <p className="min-w-0 flex-1 text-sm text-gray-500">
              You may qualify for working capital up to{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatLimit(summary.limit)}
              </span>
              .
            </p>
          ) : summary.capped ? (
            <p className="min-w-0 flex-1 text-sm text-gray-500">
              Keep selling to unlock financing. You&apos;re{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {summary.salesAway > 0
                  ? `${summary.salesAway} sale${summary.salesAway === 1 ? "" : "s"} away`
                  : `₦${Math.round(summary.amountAway).toLocaleString()} away`}
              </span>{" "}
              from unlocking a starter limit.
            </p>
          ) : (
            <p className="min-w-0 flex-1 text-sm text-gray-500">
              Keep selling to unlock financing. You&apos;re{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {summary.pointsAway} points
              </span>{" "}
              away.
            </p>
          )}
          <div className="shrink-0">
            <Button onClick={() => setWaitlistOpen(true)}>
              {summary.eligible ? "Apply for financing" : "Join the waitlist"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How we calculate your score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {summary.signals.map((s, i) => {
              const pct = Math.max(0, Math.min(100, (s.points / s.maxPoints) * 100));
              const showGroup =
                s.group != null &&
                (i === 0 || summary.signals[i - 1].group !== s.group);
              return (
                <div key={s.name}>
                  {showGroup && (
                    <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.group}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {s.name}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`How ${s.name} is computed`}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Info size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{s.how}</TooltipContent>
                    </Tooltip>
                    <span className="ml-auto text-gray-500">{s.value}</span>
                    <span className="w-16 shrink-0 text-right tabular-nums text-gray-500">
                      {formatPoints(s.points)}/{s.maxPoints}
                    </span>
                    {s.points >= s.maxPoints && (
                      <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        MAX
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#34d399] to-[#a3e635]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{s.meaning}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data consent</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center gap-3">
            <Switch
              checked={consent}
              disabled={savingConsent}
              onCheckedChange={onToggleConsent}
              aria-label="Use my sales data to compute my credit score"
            />
            <span className="text-sm text-zinc-900 dark:text-zinc-100">
              Use my sales data to compute my credit score
            </span>
          </label>
          <p className="mt-2 text-xs text-gray-500">
            You can change this anytime. Turning it off hides your score but
            doesn&apos;t delete your history.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financing offers</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.eligible ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-zinc-800 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Working capital — up to {formatLimit(summary.limit)}, 12-week
                  repayment
                </p>
                <p className="text-xs text-gray-500">Partner: Coming soon</p>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setWaitlistOpen(true)}
              >
                Request offer
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Keep selling. Financing unlocks at score 30.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500">
        Tagly is not a lender. We provide your verified sales record and score
        to licensed lenders who make the final decision.{" "}
        <span className="underline">Learn how your data is used</span>
      </p>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </div>
  );
}
