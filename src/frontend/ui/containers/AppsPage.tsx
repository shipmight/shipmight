import { Stack, HStack } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { components } from "../../../backend/api/generated/apiSchema";
import { get } from "../apiFetch";
import { AppCard } from "../components/apps";
import { CreateButton } from "../components/button";
import { ErrorBoundary, ErrorView } from "../components/error";
import { BlankSlate, LoadingView } from "../components/loading";
import useSimplePolling from "../utils/useSimplePolling";
import { useAppChart } from "./AppChartRoute";
import { useProject } from "./ProjectRoute";

const ApplicationList: React.FC<{ projectId: string }> = ({ projectId }) => {
  const appChart = useAppChart();

  const {
    load,
    hasData,
    data,
    isLoading,
    hasErrored,
    retry,
    subsequentErrors,
  } = useSimplePolling(
    {
      fetchData: async () => {
        const applications = await get(
          "/v1/projects/{projectId}/apps",
          { projectId },
          { appChartId: appChart.id },
          200
        );
        return applications;
      },
    },
    [appChart.id]
  );

  useEffect(() => {
    load();
  }, [appChart.id]);

  const [latestDeployments, setLatestDeployments] = useState<{
    [appId: string]: components["schemas"]["Deployment"];
  }>({});

  useEffect(() => {
    if (hasData) {
      const appIds = data.map((app) => app.id);
      Promise.all(
        appIds.map(async (appId) => {
          const deployments = await get(
            "/v1/apps/{appId}/deployments",
            { appId },
            {},
            200
          );
          const latestDeployment = deployments[0];
          setLatestDeployments((obj) => ({
            ...obj,
            [appId]: latestDeployment,
          }));
        })
      );
    }
  }, [hasData]);

  if (hasData) {
    return (
      <Stack spacing={4}>
        <HStack spacing={4}>
          <CreateButton
            as={Link}
            isEmphasized={!data.length}
            size="sm"
            to="create"
          >
            {data.length
              ? "Create"
              : `Create ${appChart.spec.terminology.singular}`}
          </CreateButton>
        </HStack>
        {data.length === 0 ? (
          <BlankSlate>No {appChart.spec.terminology.plural}, yet!</BlankSlate>
        ) : (
          <Stack spacing={2}>
            {data.map((app, index) => (
              <ErrorBoundary key={index}>
                <AppCard
                  app={app}
                  spec={appChart.spec}
                  latestDeployment={latestDeployments[app.id]}
                />
              </ErrorBoundary>
            ))}
          </Stack>
        )}
      </Stack>
    );
  }

  if (isLoading) {
    return <LoadingView minHeight="60px" />;
  }

  if (hasErrored) {
    return <ErrorView retry={() => retry()} errors={subsequentErrors} />;
  }

  return null;
};

const AppsPage: React.FC = () => {
  const project = useProject();
  const appChart = useAppChart();

  return (
    <>
      <Helmet>
        <title>
          {appChart.spec.terminology.pluralCapitalized} - {project.name} -
          Shipmight
        </title>
      </Helmet>
      <ApplicationList projectId={project.id} />
    </>
  );
};

export default AppsPage;
