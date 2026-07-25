const wolfDenEventsUrl = "https://www.wolfdenaddis.com/events";

export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: wolfDenEventsUrl,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
