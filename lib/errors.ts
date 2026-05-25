export class TenantError extends Error {
  constructor(message = "CRITICAL: Missing restaurant_id — tenant isolation breach") {
    super(message);
    this.name = "TenantError";
  }
}

export class AuthError extends Error {
  public statusCode: number;
  constructor(message = "Unauthorized", statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  public fields: Record<string, string[]>;
  constructor(message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}
