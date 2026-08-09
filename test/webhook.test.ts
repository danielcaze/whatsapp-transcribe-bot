import { describe, expect, test } from "vitest";
import { extractAudioMessage } from "../src/webhook";

function buildPayload(message: unknown) {
  return {
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
  };
}

describe("extractAudioMessage", () => {
  test("extracts sender and media id from an audio message", () => {
    const payload = buildPayload({
      from: "5511999999999",
      id: "wamid.abc",
      type: "audio",
      audio: { id: "media-id-123", mime_type: "audio/ogg; codecs=opus" },
    });

    const result = extractAudioMessage(payload);

    expect(result).toEqual({ from: "5511999999999", mediaId: "media-id-123" });
  });

  test("returns null for non-audio message types", () => {
    const payload = buildPayload({
      from: "5511999999999",
      id: "wamid.abc",
      type: "text",
      text: { body: "oi" },
    });

    expect(extractAudioMessage(payload)).toBeNull();
  });

  test("returns null when payload has no messages (e.g. status update)", () => {
    const payload = buildPayload(undefined);

    expect(extractAudioMessage(payload)).toBeNull();
  });
});
