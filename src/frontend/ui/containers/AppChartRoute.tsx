import React from "react";
import { Helmet } from "react-helmet";
import { Outlet, useParams } from "react-router";
import { components } from "../../../backend/api/generated/apiSchema";
import { ErrorBoundary, NotFoundView } from "../components/error";
import { useAppChartById } from "./GlobalStateWrapper";
import { useProject } from "./ProjectRoute";

type AppChart = components["schemas"]["AppChart"];

const AppChartContext = React.createContext<AppChart | undefined>(undefined);

export const useAppChart = (): AppChart => {
  const value = React.useContext(AppChartContext);
  if (!value) {
    throw new Error(
      "should use useAppChart inside AppChartRoute children only"
    );
  }
  return value;
};

const AppChartRoute: React.FC = () => {
  const project = useProject();
  const { appChartId } = useParams();
  const appChart = useAppChartById(appChartId);

  if (!appChart) {
    return <NotFoundView message="Page not found" />;
  }

  return (
    <AppChartContext.Provider value={appChart}>
      <Helmet>
        <title>
          {appChart.spec.terminology.pluralCapitalized} - {project.name} -
          Shipmight
        </title>
      </Helmet>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </AppChartContext.Provider>
  );
};

export default AppChartRoute;
