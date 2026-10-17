export default async () => {
  const site = process.env.URL;
  const secret = process.env.AUTH_SECRET;
  if (!site || !secret) {
    return new Response("URL and AUTH_SECRET are required.", { status: 500 });
  }

  const response = await fetch(new URL("/api/leave-day", site), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  return new Response(body, { status: response.status });
};

// 08:00 India Standard Time every day. India does not use daylight saving.
export const config = {
  schedule: "30 2 * * *",
};
