export default class AuthorizationError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
