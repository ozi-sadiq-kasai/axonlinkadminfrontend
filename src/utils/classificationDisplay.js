// Presentation only: persisted classification values and permission checks stay unchanged.
export const classificationDisplayLabel = (value = "") => {
  const text = String(value ?? "").trim();
  if (/^(generalist|general practitioner|medical officer)$/i.test(text)) return "Medical Officer";
  if (/^generalists$/i.test(text)) return "Medical Officers";
  if (/^specialist$/i.test(text)) return "Specialist";
  return text;
};
