import { describe, expect, test, vi } from "vitest";
import { transcribeAudio } from "../src/whisper";

describe("transcribeAudio", () => {
  test("sends audio to Groq and returns the transcribed text", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "ola mundo" }), { status: 200 })
    );

    const result = await transcribeAudio(new ArrayBuffer(4), "fake-api-key", fakeFetch);

    expect(result).toBe("ola mundo");
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer fake-api-key" },
      })
    );
  });

  test("throws when Groq responds with an error status", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response("bad request", { status: 400 })
    );

    await expect(
      transcribeAudio(new ArrayBuffer(4), "fake-api-key", fakeFetch)
    ).rejects.toThrow("Groq transcription failed: 400");
  });
});
