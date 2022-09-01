import { Divider, Heading, HStack, Stack, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { del, get, post } from "../apiFetch";
import { RunListItem } from "../components/runs";
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
import { getUnixTime } from "date-fns";

type Run = components["schemas"]["Run"];

const RunList: React.FC<
  SimplePollingState<Run[]> & { onDelete: (run: Run) => void }
> = ({
  hasData,
  data,
  isLoading,
  hasErrored,
  retry,
  subsequentErrors,
  onDelete,
}) => {
  if (hasData) {
    return (
      <>
        {data.length === 0 ? (
          <BlankSlate>No runs, yet!</BlankSlate>
        ) : (
          <Stack spacing={2} divider={<Divider borderColor="gray.200" />}>
            {data.map((run) => (
              <RunListItem
                key={run.releaseId}
                run={run}
                onDelete={() => {
                  onDelete(run);
                }}
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

const JobReleaseManager: React.FC = () => {
  const project = useProject();
  const appChart = useAppChart();
  const app = useApp();
  const toast = useToast();
  const [keepPollingUntil, setKeepPollingUntil] = useState<number>(null);

  const runsPollState = useSimplePolling(
    {
      fetchData: async () => {
        const runs = await get(
          "/v1/apps/{appId}/runs",
          { appId: app.id },
          {},
          200
        );
        return runs;
      },
      shouldPollAgain: (runs) => {
        if (keepPollingUntil && getUnixTime(new Date()) <= keepPollingUntil) {
          return true;
        }
        if (runs.some((run) => run.jobStatus.status === "RUNNING")) {
          return true;
        }
        return false;
      },
      reloadOnDepsChange: true,
    },
    [app.id, keepPollingUntil]
  );

  useEffect(() => {
    runsPollState.load();
  }, [app.id]);

  if (!runsPollState.hasData && runsPollState.isLoading) {
    return <LoadingView minHeight="100%" />;
  }

  return (
    <Stack spacing={4}>
      <AppFieldsForm
        projectId={project.id}
        appChart={appChart}
        cards={appChart.spec.releaseCards}
        values={app.values}
        submitText="Run"
        onSubmit={async (data) => {
          await post(
            "/v1/apps/{appId}/releases",
            { appId: app.id },
            {},
            data,
            201
          );
          setKeepPollingUntil(getUnixTime(new Date()) + 15);
          runsPollState.load();
          toast({
            title: "Run scheduled",
            status: "success",
            duration: 5000,
            isClosable: true,
            position: "bottom-right",
          });
        }}
      />
      <Divider borderColor="gray.200" />
      <HStack>
        <Heading size="md">Runs</Heading>
        <InlinePollingStatus {...runsPollState}>runs</InlinePollingStatus>
      </HStack>
      <RunList
        {...runsPollState}
        onDelete={async (run) => {
          await del(
            "/v1/apps/{appId}/runs/{runReleaseId}",
            { appId: app.id, runReleaseId: run.releaseId },
            {},
            204
          );
          runsPollState.load();
        }}
      />
    </Stack>
  );
};

export default JobReleaseManager;
