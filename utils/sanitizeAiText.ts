export function sanitizeAiText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[\-\*\•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

