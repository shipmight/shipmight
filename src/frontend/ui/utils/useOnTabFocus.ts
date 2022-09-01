import { useEffect } from "react";

export default function useOnTabFocus(
  callback: () => void,
  deps: unknown[]
): void {
  useEffect(() => {
    const onWindowFocus = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };
    document.addEventListener("visibilitychange", onWindowFocus);
    return function cleanup() {
      document.removeEventListener("visibilitychange", onWindowFocus);
    };
  }, deps);
}
