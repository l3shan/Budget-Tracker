/**
 * Standard success-response envelope, so every endpoint returns the same
 * shape: { success, message, data }. Keeps the frontend's API client simple
 * and consistent.
 */
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  static send(res, statusCode, data, message) {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }
}

module.exports = ApiResponse;
