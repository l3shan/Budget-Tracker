/**
 * Wraps an async Express handler so that any rejected promise is forwarded
 * to `next(err)` automatically. Without this, every controller method would
 * need an identical try/catch block — a clear DRY / duplication smell.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} fn
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
