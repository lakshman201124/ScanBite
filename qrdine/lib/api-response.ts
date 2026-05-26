import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationError(zodError: ZodError) {
  const fields = zodError.flatten().fieldErrors as Record<string, string[]>;
  return NextResponse.json(
    { success: false, error: "Validation failed", fields },
    { status: 422 }
  );
}

export function unauthorized(message = "Unauthorized") {
  return error(message, 401);
}

export function forbidden(message = "Forbidden") {
  return error(message, 403);
}

export function notFound(resource = "Resource") {
  return error(`${resource} not found`, 404);
}

export function serverError(message = "Internal server error") {
  return error(message, 500);
}
