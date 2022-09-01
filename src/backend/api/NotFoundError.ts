export default class NotFoundError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
