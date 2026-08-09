import { describe, expect, test, vi } from "vitest";
import { downloadMedia, resolveMediaUrl, sendTextMessage } from "../src/whatsapp";

describe("resolveMediaUrl", () => {
  test("fetches the media metadata and returns its download url", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/media/abc" }), {
        status: 200,
      })
    );

    const url = await resolveMediaUrl("media-id-123", "fake-token", fakeFetch);

    expect(url).toBe("https://lookaside.fbsbx.com/media/abc");
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/media-id-123",
      expect.objectContaining({
        headers: { Authorization: "Bearer fake-token" },
      })
    );
  });
});

describe("downloadMedia", () => {
  test("downloads the media bytes from the resolved url", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fakeFetch = vi.fn().mockResolvedValue(new Response(bytes, { status: 200 }));

    const result = await downloadMedia("https://lookaside.fbsbx.com/media/abc", "fake-token", fakeFetch);

    expect(new Uint8Array(result)).toEqual(bytes);
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://lookaside.fbsbx.com/media/abc",
      expect.objectContaining({
        headers: { Authorization: "Bearer fake-token" },
      })
    );
  });
});

describe("sendTextMessage", () => {
  test("posts a text reply to the Graph API", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await sendTextMessage("5511999999999", "ola mundo", "phone-number-id", "fake-token", fakeFetch);

    expect(fakeFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-number-id/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer fake-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "5511999999999",
          text: { body: "ola mundo" },
        }),
      })
    );
  });

  test("throws when the Graph API responds with an error status", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));

    await expect(
      sendTextMessage("5511999999999", "ola mundo", "phone-number-id", "fake-token", fakeFetch)
    ).rejects.toThrow("Failed to send WhatsApp message: 400");
  });
});
