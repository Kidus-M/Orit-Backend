const wolfDenMenuUrl = "https://www.wolfdenaddis.com/menu";

export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: wolfDenMenuUrl,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
