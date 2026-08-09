const GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function transcribeAudio(
  audio: ArrayBuffer,
  apiKey: string,
  fetchFn: typeof fetch
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/ogg" }), "audio.ogg");
  form.append("model", "whisper-large-v3");

  const response = await fetchFn(GROQ_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Groq transcription failed: ${response.status}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
