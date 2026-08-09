import { describe, expect, test, vi } from "vitest";
import worker, { type Env } from "../src/index";

const env: Env = {
  WHATSAPP_TOKEN: "fake-token",
  WHATSAPP_PHONE_NUMBER_ID: "phone-number-id",
  WHATSAPP_VERIFY_TOKEN: "verify-me",
  GROQ_API_KEY: "fake-groq-key",
  ALLOWED_NUMBERS: "5511999999999",
};

describe("GET /webhook (verification)", () => {
  test("returns the challenge when the verify token matches", async () => {
    const request = new Request(
      "https://worker.example/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345"
    );

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("12345");
  });

  test("returns 403 when the verify token does not match", async () => {
    const request = new Request(
      "https://worker.example/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345"
    );

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(403);
  });
});

function buildWebhookPost(message: unknown) {
  return new Request("https://worker.example/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "account-id",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "123" },
                messages: message ? [message] : undefined,
              },
              field: "messages",
            },
          ],
        },
      ],
    }),
  });
}

describe("POST /webhook (incoming message)", () => {
  test("returns 200 and does nothing for non-audio messages", async () => {
    const request = buildWebhookPost({
      from: "5511999999999",
      id: "wamid.abc",
      type: "text",
      text: { body: "oi" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
  });

  test("transcribes the audio and replies with the text for allowed numbers", async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr === "https://graph.facebook.com/v21.0/media-id-123") {
        return new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/media/abc" }), {
          status: 200,
        });
      }
      if (urlStr === "https://lookaside.fbsbx.com/media/abc") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      if (urlStr === "https://api.groq.com/openai/v1/audio/transcriptions") {
        return new Response(JSON.stringify({ text: "ola mundo" }), { status: 200 });
      }
      if (urlStr === "https://graph.facebook.com/v21.0/phone-number-id/messages") {
        return new Response("{}", { status: 200 });
      }

      throw new Error(`unexpected fetch call: ${urlStr}`);
    });
    vi.stubGlobal("fetch", fakeFetch);

    const request = buildWebhookPost({
      from: "5511999999999",
      id: "wamid.abc",
      type: "audio",
      audio: { id: "media-id-123", mime_type: "audio/ogg; codecs=opus" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-number-id/messages",
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "5511999999999",
          text: { body: "ola mundo" },
        }),
      })
    );

    vi.unstubAllGlobals();
  });

  test("returns 200 and makes no network calls for numbers outside the whitelist", async () => {
    const fakeFetch = vi.fn();
    vi.stubGlobal("fetch", fakeFetch);

    const request = buildWebhookPost({
      from: "5511000000000",
      id: "wamid.abc",
      type: "audio",
      audio: { id: "media-id-123", mime_type: "audio/ogg; codecs=opus" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(fakeFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  test("replies with a friendly error message when transcription fails", async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr === "https://graph.facebook.com/v21.0/media-id-123") {
        return new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/media/abc" }), {
          status: 200,
        });
      }
      if (urlStr === "https://lookaside.fbsbx.com/media/abc") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      if (urlStr === "https://api.groq.com/openai/v1/audio/transcriptions") {
        return new Response("service unavailable", { status: 500 });
      }
      if (urlStr === "https://graph.facebook.com/v21.0/phone-number-id/messages") {
        return new Response("{}", { status: 200 });
      }

      throw new Error(`unexpected fetch call: ${urlStr}`);
    });
    vi.stubGlobal("fetch", fakeFetch);

    const request = buildWebhookPost({
      from: "5511999999999",
      id: "wamid.abc",
      type: "audio",
      audio: { id: "media-id-123", mime_type: "audio/ogg; codecs=opus" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-number-id/messages",
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "5511999999999",
          text: { body: "não consegui transcrever, tenta de novo" },
        }),
      })
    );

    vi.unstubAllGlobals();
  });
});
