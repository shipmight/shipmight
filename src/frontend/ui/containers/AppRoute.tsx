import { Heading, Stack } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useParams } from "react-router";
import { components } from "../../../backend/api/generated/apiSchema";
import { ErrorWithResponse, get } from "../apiFetch";
import { ErrorBoundary, ErrorView, NotFoundView } from "../components/error";
import { LoadingView } from "../components/loading";
import { TabLink, Tabs } from "../components/tabs";
import AppSettings from "./AppSettings";
import ConfigurationForm from "./ConfigurationForm";
import { useAppChart } from "./AppChartRoute";
import LogViewer from "./LogViewer";
import { useProject } from "./ProjectRoute";
import DeploymentReleaseManager from "./DeploymentReleaseManager";
import JobReleaseManager from "./JobReleaseManager";

type App = components["schemas"]["App"];
type LoadError = "APP_NOT_FOUND" | unknown;

type AppContextState = {
  app: App;
  updateApp: (updated: App) => void;
};

const AppContext = React.createContext<AppContextState | undefined>(undefined);

export const useApp = (): AppContextState["app"] => {
  const state = React.useContext(AppContext);
  if (!state) {
    throw new Error("should use useApp inside AppRoute children only");
  }
  return state.app;
};

export const useUpdateApp = (): AppContextState["updateApp"] => {
  const state = React.useContext(AppContext);
  if (!state) {
    throw new Error("should use useUpdateApp inside AppRoute children only");
  }
  return state.updateApp;
};

const AppRoute: React.FC = () => {
  const project = useProject();
  const appChart = useAppChart();
  const { appId, tabId } = useParams();
  const [app, setApp] = useState<App>();
  const [error, setError] = useState<LoadError>();

  useEffect(() => {
    get("/v1/apps/{appId}", { appId }, {}, 200)
      .then((app) => {
        if (app.projectId !== project.id) {
          throw new Error("projectId mismatch");
        }
        if (app.appChartId !== appChart.id) {
          throw new Error("appChartId mismatch");
        }
        setApp(app);
      })
      .catch((error) => {
        console.error(error);
        if (
          error instanceof ErrorWithResponse &&
          error.response.status === 404
        ) {
          setError("APP_NOT_FOUND");
          return;
        }
        setError(error);
      });
  }, [project.id, appChart.id, appId]);

  if (error === "APP_NOT_FOUND") {
    return (
      <NotFoundView
        message="App not found"
        backUrl={`/projects/${project.id}/apps/${appChart.id}`}
        backText={`Go to ${appChart.spec.terminology.plural}`}
      />
    );
  }

  if (error) {
    return <ErrorView errors={[error]} />;
  }

  if (!app) {
    return <LoadingView minHeight="100%" />;
  }

  if (!tabId) {
    const defaultTab =
      appChart.spec.tabs.find((tab) => tab.isDefault) || appChart.spec.tabs[0];
    return <Navigate to={defaultTab.id} />;
  }

  const currentTab = appChart.spec.tabs.find((tab) => tab.id === tabId);

  const nameFieldValue =
    typeof app.values[appChart.spec.listCard.nameFieldId] === "string"
      ? app.values[appChart.spec.listCard.nameFieldId]
      : "(unknown)";

  let tabContent = <NotFoundView />;
  let pageTitle: string;
  if (currentTab) {
    pageTitle = currentTab.name;
    switch (currentTab.content.type) {
      case "DeploymentReleaseManager": {
        tabContent = <DeploymentReleaseManager />;
        break;
      }

      case "JobReleaseManager": {
        tabContent = <JobReleaseManager />;
        break;
      }

      case "ConfigurationForm": {
        tabContent = <ConfigurationForm />;
        break;
      }

      case "LogViewer": {
        tabContent = <LogViewer tabId={currentTab.id} />;
        break;
      }
    }
  } else if (tabId) {
    switch (tabId) {
      case "settings": {
        pageTitle = "Settings";
        tabContent = <AppSettings />;
        break;
      }
    }
  }

  return (
    <AppContext.Provider
      value={{
        app,
        updateApp: (updated) => setApp(updated),
      }}
    >
      <Helmet>
        <title>
          {pageTitle ? `${pageTitle} - ` : ""} {nameFieldValue} - Shipmight
        </title>
      </Helmet>
      <Stack spacing={4}>
        <Heading>{nameFieldValue}</Heading>
        <Tabs>
          {appChart.spec.tabs.map((tab, index) => (
            <TabLink key={index} to={`../${tab.id}`}>
              {tab.name}
            </TabLink>
          ))}
          <TabLink key="settings" to="../settings">
            Settings
          </TabLink>
        </Tabs>
        <ErrorBoundary>{tabContent}</ErrorBoundary>
      </Stack>
    </AppContext.Provider>
  );
};

export default AppRoute;
