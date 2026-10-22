/**
 * Uniform API response helper for SkillVault.
 * Ensures every successful API response has a consistent shape:
 * { success: true, message: '...', data: {...} }
 */
export class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable success message
   * @param {*} [data] - Response payload
   */
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.body = {
      success: true,
      message,
      ...(data !== null && data !== undefined && { data })
    };
  }

  /**
   * Send the response using an Express response object.
   * @param {import('express').Response} res
   */
  send(res) {
    return res.status(this.statusCode).json(this.body);
  }

  static ok(res, message = 'Success', data) {
    return new ApiResponse(200, message, data).send(res);
  }

  static created(res, message = 'Created successfully', data) {
    return new ApiResponse(201, message, data).send(res);
  }

  static noContent(res) {
    return res.status(204).end();
  }
}

export default ApiResponse;
