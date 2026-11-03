"use client";

import { useState } from "react";

export function WhatsAppConnect() {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState("");

  async function saveManual() {
    setStatus("Saving...");
    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumberId, accessToken }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Saved." : (data.error || "Failed."));
  }

  function startEmbedded() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    if (!appId || !configId) {
      setStatus("Meta app/config not configured.");
      return;
    }
    // @ts-ignore
    if (!window.FB) {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => initFB(appId, configId);
      document.body.appendChild(script);
    } else {
      initFB(appId, configId);
    }
  }

  function initFB(appId: string, configId: string) {
    // @ts-ignore
    window.FB.init({ appId, cookie: true, xfbml: true, version: "v18.0" });
    // @ts-ignore
    window.FB.login(
      async (response: any) => {
        if (response.authResponse?.code) {
          setStatus("Connecting...");
          const res = await fetch("/api/whatsapp/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: response.authResponse.code }),
          });
          const data = await res.json();
          setStatus(res.ok ? "Connected." : (data.error || "Failed."));
        } else {
          setStatus("Signup cancelled or failed.");
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
      }
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={startEmbedded} className="rounded bg-green-600 px-4 py-2 text-white">
        Connect WhatsApp (Embedded Signup)
      </button>
      <div className="space-y-2">
        <input
          placeholder="WhatsApp Phone Number ID"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          placeholder="WhatsApp Access Token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <button onClick={saveManual} className="rounded border px-4 py-2">
          Save manually
        </button>
      </div>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
