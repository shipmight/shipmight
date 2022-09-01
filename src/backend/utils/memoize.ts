export const memoizePromiseFn = <T>(
  promiseFn: () => Promise<T>,
  options: {
    expireSeconds: number;
    prefetch?: boolean;
  }
): (() => Promise<T>) => {
  let memoizedPromise: Promise<T>;
  let expiresAt: number;

  const memoizedFn = async (): Promise<T> => {
    if (
      !memoizedPromise ||
      (typeof expiresAt !== "undefined" && Date.now() >= expiresAt)
    ) {
      memoizedPromise = promiseFn();
      expiresAt = Date.now() + options.expireSeconds * 1000;
    }
    return memoizedPromise;
  };

  if (options.prefetch) {
    memoizedFn();
  }

  return memoizedFn;
};
