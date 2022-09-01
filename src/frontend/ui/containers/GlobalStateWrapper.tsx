import React, { useEffect, useState } from "react";
import { get } from "../apiFetch";
import { ErrorView } from "../components/error";
import { LoadingView } from "../components/loading";
import { components, paths } from "../../../backend/api/generated/apiSchema";

type AppChart = components["schemas"]["AppChart"];
type ServicesObjs =
  paths["/v1/services"]["get"]["responses"][200]["content"]["application/json"];

type GlobalState = {
  appCharts: AppChart[];
  appChartsById: Record<string, AppChart>;
  servicesObjs: ServicesObjs;
};

export const GlobalStateContext = React.createContext<GlobalState>({
  appCharts: [],
  appChartsById: {},
  servicesObjs: {
    loki: { isEnabled: false },
  },
});

export const useAppCharts = (): AppChart[] => {
  const { appCharts } = React.useContext(GlobalStateContext);
  return appCharts;
};

export const useAppChartById = (id: string): AppChart => {
  const { appChartsById } = React.useContext(GlobalStateContext);
  return appChartsById[id];
};

export function useServiceObj<T extends keyof ServicesObjs>(
  id: T
): ServicesObjs[T] {
  const { servicesObjs: services } = React.useContext(GlobalStateContext);
  return services[id];
}

const GlobalStateWrapper: React.FC = ({ children }) => {
  const [globalState, setGlobalState] = useState<GlobalState>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    Promise.all([
      get("/v1/app-charts", {}, {}, 200),
      get("/v1/services", {}, {}, 200),
    ])
      .then(([appCharts, servicesObjs]) => {
        setGlobalState({
          appCharts,
          appChartsById: appCharts.reduce<GlobalState["appChartsById"]>(
            (obj, appChart) => {
              return {
                ...obj,
                [appChart["id"]]: appChart,
              };
            },
            {}
          ),
          servicesObjs,
        });
      })
      .catch((error) => {
        console.error(error);
        setError(error);
      });
  }, []);

  if (error) {
    return <ErrorView errors={[error]} />;
  }

  if (!globalState) {
    return <LoadingView minHeight="100%" />;
  }

  return (
    <GlobalStateContext.Provider value={globalState}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export default GlobalStateWrapper;
