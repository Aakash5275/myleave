import { formatDate } from "@/lib/format";

async function postSlack(text: string) {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) return;

  let url: URL;
  try {
    url = new URL(webhook);
  } catch {
    console.error("SLACK_WEBHOOK_URL is not a valid URL.");
    return;
  }
  if (url.protocol !== "https:" || url.hostname !== "hooks.slack.com") {
    console.error("SLACK_WEBHOOK_URL must be an https://hooks.slack.com incoming webhook.");
    return;
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      console.error(`Slack notification failed (${response.status}).`);
    }
  } catch (error) {
    console.error("Slack notification failed.", error instanceof Error ? error.message : error);
  }
}

function leaveSpan(start: string | Date, end: string | Date, days: number, type: string) {
  return `${formatDate(start)} – ${formatDate(end)} · ${days} day(s) of ${type.toLowerCase()} leave`;
}

export async function notifyLeaveRequested(input: {
  name: string;
  type: string;
  start: string;
  end: string;
  days: number;
  reason: string;
}) {
  await postSlack(
    [
      "*New leave request*",
      `${input.name} requested ${input.days} day(s) of ${input.type.toLowerCase()} leave.`,
      `${formatDate(input.start)} – ${formatDate(input.end)}`,
      `Reason: ${input.reason}`,
    ].join("\n"),
  );
}

export async function notifyLeaveApproved(input: {
  name: string;
  type: string;
  start: Date;
  end: Date;
  days: number;
  automatic: boolean;
  reviewer?: string;
}) {
  const headline = input.automatic ? "*Leave approved automatically*" : "*Leave approved*";
  const detail = input.automatic
    ? `${input.name}'s request was still waiting when the leave day started, so it was approved.`
    : `${input.reviewer ?? "An admin"} approved ${input.name}'s leave.`;
  await postSlack([headline, detail, leaveSpan(input.start, input.end, input.days, input.type)].join("\n"));
}

export async function notifyOnLeaveToday(input: {
  dateLabel: string;
  people: Array<{ name: string; type: string; end: Date }>;
}) {
  if (!input.people.length) return;
  const lines = input.people.map((person) => `• ${person.name} · ${person.type} · back after ${formatDate(person.end)}`);
  await postSlack([`*On leave today* · ${input.dateLabel}`, ...lines].join("\n"));
}
