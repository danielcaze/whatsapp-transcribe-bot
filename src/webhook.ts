export interface AudioMessage {
  from: string;
  mediaId: string;
}

export function extractAudioMessage(payload: unknown): AudioMessage | null {
  const message = (payload as any)?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message || message.type !== "audio" || !message.audio?.id) {
    return null;
  }

  return { from: message.from, mediaId: message.audio.id };
}
