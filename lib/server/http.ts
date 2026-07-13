import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init?.headers,
    },
  });
}

export async function handleRoute(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) {
      return json(
        { error: error.message, details: error.details },
        { status: error.status },
      );
    }
    if (error instanceof ZodError) {
      return json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error(error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

