import React, { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { get } from "../apiFetch";
import { LoadingView } from "../components/loading";
import { Page } from "../components/page";
import AppRoute from "./AppRoute";
import AppsPage from "./AppsPage";
import CreateAppPage from "./CreateAppPage";
import CreateFilePage from "./CreateFilePage";
import EditFilePage from "./EditFilePage";
import AppChartRoute from "./AppChartRoute";
import FilesPage from "./FilesPage";
import { useAppCharts } from "./GlobalStateWrapper";
import { ProjectLogsPage, SystemLogsPage } from "./LogsPage";
import ManagePage from "./ManagePage";
import MetricsPage from "./MetricsPage";
import NetworkPage from "./NetworkPage";
import NotFoundPage from "./NotFoundPage";
import ProjectRoute from "./ProjectRoute";
import LicensePage from "./LicensePage";

const Logout: React.FC<{ logout: () => Promise<void> }> = ({ logout }) => {
  useEffect(() => {
    logout().then(() => {
      // Force page reload to clear potential in-memory values
      window.location.replace("/");
    });
  }, []);

  return (
    <Page>
      <LoadingView minHeight="100%" />
    </Page>
  );
};

const RedirectToDefaultProject: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    get("/v1/projects", {}, {}, 200)
      .then((projects) => {
        const project = projects[0];
        navigate(`/projects/${project.id}`, { replace: true });
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <Page>
      <LoadingView minHeight="100%" />
    </Page>
  );
};

const Router: React.FC<{ logout: () => Promise<void> }> = ({ logout }) => {
  const appCharts = useAppCharts();

  return (
    <Routes>
      <Route path="/projects">
        <Route path=":projectId/logs" element={<ProjectLogsPage />} />
        <Route path=":projectId" element={<ProjectRoute />}>
          <Route path="apps">
            <Route path=":appChartId" element={<AppChartRoute />}>
              <Route path="create" element={<CreateAppPage />} />
              <Route path=":appId">
                <Route path=":tabId" element={<AppRoute />} />
                <Route path="*" element={<AppRoute />} />
                <Route index element={<AppRoute />} />
              </Route>
              <Route index element={<AppsPage />} />
            </Route>
            <Route index element={<Navigate to={appCharts[0].id} replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="files">
            <Route path="create" element={<CreateFilePage />} />
            <Route path=":fileId" element={<EditFilePage />} />
            <Route index element={<FilesPage />} />
          </Route>
          <Route path="metrics">
            <Route index element={<MetricsPage />} />
          </Route>
          <Route path="network">
            <Route index element={<NetworkPage />} />
          </Route>
          <Route
            index
            element={<Navigate to={`apps/${appCharts[0].id}`} replace />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route index element={<RedirectToDefaultProject />} />
      </Route>
      <Route path="/manage">
        <Route path="logs">
          <Route
            path="kube-system"
            element={<SystemLogsPage category="kube-system" />}
          />
          <Route
            path="shipmight"
            element={<SystemLogsPage category="shipmight" />}
          />
        </Route>
        <Route index element={<ManagePage />} />
      </Route>
      <Route path="/logout" element={<Logout logout={logout} />} />
      <Route path="/license" element={<LicensePage />} />
      <Route index element={<RedirectToDefaultProject />} />
      <Route path="*" element={<NotFoundPage showBackToHome />} />
    </Routes>
  );
};

export default Router;
