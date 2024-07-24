class ApiResponse {
  constructor(status = 200, message = "Success", data = null) {
    this.status = status;
    this.message = message;
    this.data = data;
    // this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      status: this.status,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

module.exports = ApiResponse;
