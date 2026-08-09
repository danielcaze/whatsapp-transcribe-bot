const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export async function resolveMediaUrl(
  mediaId: string,
  token: string,
  fetchFn: typeof fetch
): Promise<string> {
  const response = await fetchFn(`${GRAPH_API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function downloadMedia(
  url: string,
  token: string,
  fetchFn: typeof fetch
): Promise<ArrayBuffer> {
  const response = await fetchFn(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.arrayBuffer();
}

export async function sendTextMessage(
  to: string,
  text: string,
  phoneNumberId: string,
  token: string,
  fetchFn: typeof fetch
): Promise<void> {
  const response = await fetchFn(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send WhatsApp message: ${response.status}`);
  }
}
