import { extractAudioMessage } from "./webhook";
import { downloadMedia, resolveMediaUrl, sendTextMessage } from "./whatsapp";
import { transcribeAudio } from "./whisper";
import { isAllowedNumber } from "./whitelist";

export interface Env {
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
  GROQ_API_KEY: string;
  ALLOWED_NUMBERS: string;
}

function handleVerify(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

async function handleIncoming(request: Request, env: Env): Promise<Response> {
  const payload = await request.json();
  const message = extractAudioMessage(payload);

  if (!message) {
    return new Response("OK", { status: 200 });
  }

  if (!isAllowedNumber(message.from, env.ALLOWED_NUMBERS)) {
    return new Response("OK", { status: 200 });
  }

  try {
    const mediaUrl = await resolveMediaUrl(message.mediaId, env.WHATSAPP_TOKEN, fetch);
    const audioBytes = await downloadMedia(mediaUrl, env.WHATSAPP_TOKEN, fetch);
    const text = await transcribeAudio(audioBytes, env.GROQ_API_KEY, fetch);
    await sendTextMessage(message.from, text, env.WHATSAPP_PHONE_NUMBER_ID, env.WHATSAPP_TOKEN, fetch);
  } catch (error) {
    console.error(error);
    await sendTextMessage(
      message.from,
      "não consegui transcrever, tenta de novo",
      env.WHATSAPP_PHONE_NUMBER_ID,
      env.WHATSAPP_TOKEN,
      fetch
    );
  }

  return new Response("OK", { status: 200 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/webhook") {
      return handleVerify(request, env);
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleIncoming(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};
