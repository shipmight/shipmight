import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Outlet, useParams } from "react-router";
import { ApiGetRequestResponse } from "../../../backend/api/requests";
import { ErrorWithResponse, get } from "../apiFetch";
import { ErrorBoundary, ErrorView, NotFoundView } from "../components/error";
import { LoadingView } from "../components/loading";
import { Page } from "../components/page";
import { SidebarLinks } from "../components/sidebar";
import { useAppCharts, useServiceObj } from "./GlobalStateWrapper";

type Project = ApiGetRequestResponse<"/v1/projects", 200>[number];
type LoadError = "PROJECT_NOT_FOUND" | unknown;

const ProjectContext = React.createContext<Project | undefined>(undefined);

export const useProject = (): Project => {
  const value = React.useContext(ProjectContext);
  if (!value) {
    throw new Error("should use useProject inside ProjectRoute children only");
  }
  return value;
};

const ProjectRoute: React.FC = () => {
  const { projectId } = useParams();
  const appCharts = useAppCharts();
  const [project, setProject] = useState<Project>();
  const [error, setError] = useState<LoadError>();

  useEffect(() => {
    get("/v1/projects/{projectId}", { projectId }, {}, 200)
      .then((project) => {
        setProject(project);
      })
      .catch((error) => {
        console.error(error);
        if (
          error instanceof ErrorWithResponse &&
          error.response.status === 404
        ) {
          setError("PROJECT_NOT_FOUND");
          return;
        }
        setError(error);
      });
  }, [projectId]);

  if (error === "PROJECT_NOT_FOUND") {
    return (
      <Page>
        <NotFoundView
          message="Project not found"
          backUrl="/projects"
          backText="Go to projects"
        />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <ErrorView errors={[error]} />
      </Page>
    );
  }

  if (!project) {
    return (
      <Page>
        <LoadingView minHeight="100%" />
      </Page>
    );
  }

  const resourceLinks = [
    ...appCharts.map((appChart) => ({
      text: appChart.spec.terminology.pluralCapitalized,
      to: `/projects/${projectId}/apps/${appChart.id}`,
    })),
    {
      text: "Files",
      to: `/projects/${projectId}/files`,
    },
    {
      text: "Network",
      to: `/projects/${projectId}/network`,
    },
    // {
    //   text: "Stacks",
    //   to: `/projects/${projectId}/stacks`,
    // },
    // {
    //   text: "Volumes",
    //   to: `/projects/${projectId}/volumes`,
    // },
  ];
  resourceLinks.sort((a, b) => a.text.localeCompare(b.text));

  const lokiServiceObj = useServiceObj("loki");
  const logsLink: SidebarLinks = lokiServiceObj.isEnabled
    ? [
        {
          text: "Logs",
          to: `/projects/${projectId}/logs`,
          icon: "BoxedArrowForward",
        },
      ]
    : [];

  const sidebarLinks: SidebarLinks = [
    { heading: "Resources" },
    ...resourceLinks,
    { heading: "Monitoring" },
    ...logsLink,
    {
      text: "Metrics",
      to: `/projects/${projectId}/metrics`,
    },
    { divider: true },
    {
      text: "Manage",
      to: "/manage",
    },
    { divider: true },
    {
      text: "Log out",
      to: "/logout",
    },
  ];

  return (
    <ProjectContext.Provider value={project}>
      <Helmet>
        <title>{project.name} - Shipmight</title>
      </Helmet>
      <Page sidebarLinks={sidebarLinks}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Page>
    </ProjectContext.Provider>
  );
};

export default ProjectRoute;
