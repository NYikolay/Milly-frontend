export class ApiError extends Error {
  status: number;
  code: string;
  description: string;
  requestId: string;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      requestId: string;
      description?: string;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.description = options.description ?? "";
  }
}

export class ApiNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiNetworkError";
  }
}
