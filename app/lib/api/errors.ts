export class ApiError extends Error {
  status: number;
  code: string;
  requestId: string;

  constructor(
    message: string,
    options: { status: number; code: string; requestId: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
  }
}

export class ApiNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiNetworkError";
  }
}
