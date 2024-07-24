class ApiError extends Error {
  constructor(
    status = 500,
    message = "Internal Server Error From Api",
    data = null,
    errorCode = null
  ) {
    super(message);
    this.status = status;
    this.message = message;
    this.data = data;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();

    // Capture the stack trace, excluding the constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON() {
    return {
      status: this.status,
      message: this.message,
      data: this.data,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      //   stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

module.exports = ApiError;
