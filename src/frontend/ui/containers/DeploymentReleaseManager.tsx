import { Divider, Heading, HStack, Stack, useToast } from "@chakra-ui/react";
import { getUnixTime } from "date-fns";
import React, { useEffect, useState } from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { get, post } from "../apiFetch";
import { DeploymentListItem } from "../components/deployments";
import { ErrorView } from "../components/error";
import {
  BlankSlate,
  InlinePollingStatus,
  LoadingView,
} from "../components/loading";
import useSimplePolling, {
  SimplePollingState,
} from "../utils/useSimplePolling";
import AppFieldsForm from "./AppFieldsForm";
import { useApp } from "./AppRoute";
import { useAppChart } from "./AppChartRoute";
import { useProject } from "./ProjectRoute";

const DeploymentList: React.FC<
  SimplePollingState<components["schemas"]["Deployment"][]>
> = ({ hasData, data, isLoading, hasErrored, retry, subsequentErrors }) => {
  if (hasData) {
    return (
      <>
        {data.length === 0 ? (
          <BlankSlate>No deployments, yet!</BlankSlate>
        ) : (
          <Stack spacing={2} divider={<Divider borderColor="gray.200" />}>
            {data.map((deployment) => (
              <DeploymentListItem
                key={deployment.releaseId}
                deployment={deployment}
              />
            ))}
          </Stack>
        )}
      </>
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

const DeploymentReleaseManager: React.FC = () => {
  const project = useProject();
  const appChart = useAppChart();
  const app = useApp();
  const toast = useToast();
  const [keepPollingUntil, setKeepPollingUntil] = useState<number>(null);

  const pollState = useSimplePolling(
    {
      fetchData: async () => {
        const [releases, deployments] = await Promise.all([
          get("/v1/apps/{appId}/releases", { appId: app.id }, {}, 200),
          get("/v1/apps/{appId}/deployments", { appId: app.id }, {}, 200),
        ]);

        return { releases, deployments };
      },
      shouldPollAgain: ({ deployments }) => {
        if (keepPollingUntil && getUnixTime(new Date()) <= keepPollingUntil) {
          return true;
        }
        if (
          deployments.some((deployment) =>
            deployment.podStatuses.some(
              (podStatus) => podStatus.status !== "RUNNING"
            )
          )
        ) {
          return true;
        }
        return false;
      },
      reloadOnDepsChange: true,
    },
    [app.id, keepPollingUntil]
  );

  useEffect(() => {
    pollState.load();
  }, [app.id]);

  if (!pollState.hasData && pollState.isLoading) {
    return <LoadingView minHeight="100%" />;
  }

  let values = {
    ...app.values,
  };

  const lastRelease = pollState.data.releases[0];
  if (lastRelease) {
    values = {
      ...values,
      ...lastRelease.values,
    };
  }

  return (
    <Stack spacing={4}>
      <AppFieldsForm
        projectId={project.id}
        appChart={appChart}
        cards={appChart.spec.releaseCards}
        values={values}
        submitText="Deploy"
        onSubmit={async (data) => {
          await post(
            "/v1/apps/{appId}/releases",
            { appId: app.id },
            {},
            data,
            201
          );
          setKeepPollingUntil(getUnixTime(new Date()) + 15);
          pollState.load();
          toast({
            title: "Deployment scheduled",
            status: "success",
            duration: 5000,
            isClosable: true,
            position: "bottom-right",
          });
        }}
      />
      <Divider borderColor="gray.200" />
      <HStack>
        <Heading size="md">Deployments</Heading>
        <InlinePollingStatus {...pollState}>deployments</InlinePollingStatus>
      </HStack>
      <DeploymentList {...pollState} data={pollState.data.deployments} />
    </Stack>
  );
};

export default DeploymentReleaseManager;
