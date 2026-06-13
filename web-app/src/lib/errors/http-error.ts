import { ApplicationError } from "./application-error";

export class HttpError extends ApplicationError {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
