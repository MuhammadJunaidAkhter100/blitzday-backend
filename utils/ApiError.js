export class ApiError extends Error {
    status;
    code;
  
    constructor(status, message, code) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  