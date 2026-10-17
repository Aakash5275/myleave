import { formatDate } from "@/lib/format";

export async function notifyLeaveSlack(input: {
  name: string;
  type: string;
  start: string;
  end: string;
  days: number;
  reason: string;
}) {
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

  const text = [
    "*New leave request*",
    `${input.name} requested ${input.days} day(s) of ${input.type.toLowerCase()} leave.`,
    `${formatDate(input.start)} – ${formatDate(input.end)}`,
    `Reason: ${input.reason}`,
  ].join("\n");

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      console.error(`Slack leave notification failed (${response.status}).`);
    }
  } catch (error) {
    console.error("Slack leave notification failed.", error instanceof Error ? error.message : error);
  }
}
