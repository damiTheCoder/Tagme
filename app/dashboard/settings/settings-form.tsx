"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";
import { updateBusinessSettings } from "./actions";

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "INR", "BRL", "IDR", "PHP"];

export type SettingsInitial = {
  name: string;
  description: string | null;
  hours: string | null;
  policies: string | null;
  notification_email: string | null;
  currency: string;
};

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [hours, setHours] = useState(initial.hours ?? "");
  const [policies, setPolicies] = useState(initial.policies ?? "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(Boolean(initial.notification_email));
  const [notificationEmail, setNotificationEmail] = useState(initial.notification_email ?? "");
  const [currency, setCurrency] = useState(initial.currency);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateBusinessSettings({
      name,
      description,
      hours,
      policies,
      notification_email: notificationsEnabled ? notificationEmail : "",
      currency,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader title="Settings" description="Manage your business profile and preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="text-sm font-medium">
              Business name
              <Input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </label>
            <label className="text-sm font-medium">
              Description
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What do you sell?"
                className="mt-1 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066ff]"
              />
            </label>
            <label className="text-sm font-medium">
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066ff]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Hours & policies</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label className="text-sm font-medium">
                Business hours
                <textarea
                  rows={3}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder={"Mon-Fri 9am-6pm\nSat 10am-4pm\nSun closed"}
                  className="mt-1 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066ff]"
                />
              </label>
              <label className="text-sm font-medium">
                Policies
                <textarea
                  rows={3}
                  value={policies}
                  onChange={(e) => setPolicies(e.target.value)}
                  placeholder="No refunds after 24 hours. Delivery within Lagos only."
                  className="mt-1 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066ff]"
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label className="flex items-center justify-between text-sm font-medium">
                Email notifications
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </label>
              <Separator />
              <label className="text-sm font-medium">
                Notification email
                <Input
                  type="email"
                  value={notificationEmail}
                  disabled={!notificationsEnabled}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-1 bg-white px-1 py-3">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
