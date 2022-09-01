import React, { useEffect, useMemo, useState } from "react";
import { InlinePollingStatus } from "../components/loading";
import useOnTabFocus from "./useOnTabFocus";

interface CommonSimplePollingState<T> {
  data: T | undefined;
  hasData: boolean;
  isLoading: boolean;
  hasBeenLoadingForAWhile: boolean;
  hasErrors: boolean;
  hasErrored: boolean;
  subsequentErrors: unknown[];
}

interface InternalSimplePollingState<T> extends CommonSimplePollingState<T> {}

export interface SimplePollingState<T> extends CommonSimplePollingState<T> {
  load: () => void;
  retry: () => void;
  data: T | undefined;
  InlineStatus: React.FC;
}

const initialState = {
  subsequentErrors: [],
  data: undefined,
  hasData: false,
  isLoading: true,
  hasBeenLoadingForAWhile: false,
  hasErrors: false,
  hasErrored: false,
};

export default function useSimplePolling<T>(
  {
    fetchData,
    shouldPollAgain,
    interval = 2000,
    retryInterval = 1000,
    hasBeenLoadingForAWhileThresholdMs = 500,
    hasErroredThreshold = 3,
    loadOnTabFocus = false,
    reloadOnDepsChange = false,
  }: {
    fetchData: () => Promise<T>;
    shouldPollAgain?: (data: T) => boolean;
    interval?: number;
    retryInterval?: number;
    hasBeenLoadingForAWhileThresholdMs?: number;
    hasErroredThreshold?: number;
    loadOnTabFocus?: boolean;
    reloadOnDepsChange?: boolean;
  },
  userDeps: unknown[]
): SimplePollingState<T> {
  const deps = [
    interval,
    retryInterval,
    hasBeenLoadingForAWhileThresholdMs,
    hasErroredThreshold,
    loadOnTabFocus,
    reloadOnDepsChange,
    ...userDeps,
  ];

  const [state, setState] = useState<InternalSimplePollingState<T>>(() => ({
    ...initialState,
  }));

  const { cleanup, load, retry } = useMemo<
    Pick<SimplePollingState<T>, "load" | "retry"> & {
      cleanup: () => void;
    }
  >(() => {
    let hasBeenUnmounted = false;

    let pendingTimeout: NodeJS.Timeout;
    let hasBeenLoadingForAWhileTimeout: NodeJS.Timeout;

    const load = () => {
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }
      if (hasBeenLoadingForAWhileTimeout) {
        clearTimeout(hasBeenLoadingForAWhileTimeout);
      }
      if (hasBeenUnmounted) {
        return;
      }
      setState((prevState) => ({
        ...prevState,
        isLoading: true,
      }));
      if (hasBeenUnmounted) {
        return;
      }
      hasBeenLoadingForAWhileTimeout = setTimeout(() => {
        setState((prevState) => ({
          ...prevState,
          hasBeenLoadingForAWhile: true,
        }));
      }, hasBeenLoadingForAWhileThresholdMs);
      fetchData()
        .then((data) => {
          clearTimeout(hasBeenLoadingForAWhileTimeout);
          pendingTimeout =
            shouldPollAgain !== undefined && shouldPollAgain(data)
              ? setTimeout(() => load(), interval)
              : undefined;
          if (hasBeenUnmounted) {
            return;
          }
          setState(() => ({
            subsequentErrors: [],
            data,
            hasData: true,
            isLoading: false,
            hasBeenLoadingForAWhile: false,
            hasErrors: false,
            hasErrored: false,
          }));
        })
        .catch((error) => {
          clearTimeout(hasBeenLoadingForAWhileTimeout);
          if (hasBeenUnmounted) {
            return;
          }
          setState((prevState) => {
            const subsequentErrors = [...prevState.subsequentErrors, error];
            const hasErrored = subsequentErrors.length >= hasErroredThreshold;
            pendingTimeout = hasErrored
              ? undefined
              : setTimeout(() => load(), retryInterval);
            return {
              ...prevState,
              subsequentErrors,
              isLoading: !hasErrored,
              hasErrors: true,
              hasErrored,
            };
          });
        });
    };

    const retry = () => {
      if (hasBeenUnmounted) {
        return;
      }
      setState({ ...initialState });
      load();
    };

    const cleanup = () => {
      hasBeenUnmounted = true;
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }
      if (hasBeenLoadingForAWhileTimeout) {
        clearTimeout(hasBeenLoadingForAWhileTimeout);
      }
    };

    return {
      cleanup,
      load,
      retry,
    };
  }, deps);

  useOnTabFocus(() => {
    if (loadOnTabFocus) {
      load();
    }
  }, deps);

  useEffect(() => {
    if (reloadOnDepsChange) {
      load();
    }
  }, deps);

  useEffect(() => {
    return cleanup;
  }, deps);

  const InlineStatus: React.FC = ({ children }) => {
    return React.createElement(
      InlinePollingStatus,
      {
        hasErrored: state.hasErrored,
        retry,
        hasErrors: state.hasErrors,
        hasBeenLoadingForAWhile: state.hasBeenLoadingForAWhile,
      },
      children
    );
  };

  return {
    load,
    retry,
    data: state.data,
    hasData: state.hasData,
    isLoading: state.isLoading,
    hasBeenLoadingForAWhile: state.hasBeenLoadingForAWhile,
    hasErrors: state.hasErrors,
    hasErrored: state.hasErrored,
    subsequentErrors: state.subsequentErrors,
    InlineStatus,
  };
}
