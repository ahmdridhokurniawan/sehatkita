export function shouldCelebrateCompletion(
  previousStatus: string | null,
  nextStatus: string | null,
): boolean {
  return previousStatus !== null && previousStatus !== "selesai" && nextStatus === "selesai";
}
