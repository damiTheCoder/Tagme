export type WhatsAppButton = { id: string; title: string };

export async function sendWhatsAppButtons(
  to: string,
  text: string,
  buttons: WhatsAppButton[],
  phoneNumberId?: string | null,
  token?: string | null
) {
  const pid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const tok = token || process.env.WHATSAPP_TOKEN;
  const url = `https://graph.facebook.com/v18.0/${pid}/messages`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      },
    }),
  });
}

export type WhatsAppListSection = {
  title: string;
  rows: { id: string; title: string; description?: string }[];
};

export async function sendWhatsAppList(
  to: string,
  text: string,
  buttonText: string,
  sections: WhatsAppListSection[],
  phoneNumberId?: string | null,
  token?: string | null
) {
  const pid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const tok = token || process.env.WHATSAPP_TOKEN;
  const url = `https://graph.facebook.com/v18.0/${pid}/messages`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text },
        action: {
          button: buttonText.slice(0, 20),
          sections: sections.map((s) => ({
            title: s.title,
            rows: s.rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: r.description?.slice(0, 72),
            })),
          })),
        },
      },
    }),
  });
}
