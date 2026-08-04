const wolfDenWelcomeUrl = "https://www.wolfdenaddis.com/welcome";

export function GET() {
  return new Response(null, {
    status: 307,
    headers: {
      Location: wolfDenWelcomeUrl,
      "Cache-Control": "public, max-age=300",
    },
  });
}
