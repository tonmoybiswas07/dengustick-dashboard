export type ReportFrequency = "daily" | "weekly" | "monthly";

const dhakaOffset = 6 * 60 * 60 * 1000;
const day = 86_400_000;

export function reportSchedulePeriod(frequency: ReportFrequency, now: Date) {
  const local = new Date(now.getTime() + dhakaOffset);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const date = local.getUTCDate();
  const weekday = local.getUTCDay();
  const boundary = frequency === "monthly" ? Date.UTC(year, month, 1) :
    Date.UTC(year, month, frequency === "weekly" ? date - (weekday + 6) % 7 : date);
  const next = frequency === "monthly" ? Date.UTC(year, month + 1, 1) :
    boundary + day * (frequency === "weekly" ? 7 : 1);
  const previous = frequency === "monthly" ? Date.UTC(year, month - 1, 1) :
    boundary - day * (frequency === "weekly" ? 7 : 1);
  return {
    nextRunAt: new Date(next - dhakaOffset),
    startDate: new Date(previous).toISOString().slice(0, 10),
    endDate: new Date(boundary - day).toISOString().slice(0, 10),
  };
}
