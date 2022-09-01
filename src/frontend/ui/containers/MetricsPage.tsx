import { Divider, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { ErrorWithResponse, get } from "../apiFetch";
import { ErrorView } from "../components/error";
import { BlankSlate, LoadingView } from "../components/loading";
import { InlineMetricsChart } from "../components/metrics";
import useSimplePolling from "../utils/useSimplePolling";
import { useProject } from "./ProjectRoute";

const METRICS_SERVER_UNAVAILABLE = "METRICS_SERVER_UNAVAILABLE";

const ApplicationMetrics: React.FC<{ projectId: string }> = ({ projectId }) => {
  const {
    load,
    hasData,
    data,
    isLoading,
    hasErrored,
    retry,
    subsequentErrors,
    InlineStatus,
  } = useSimplePolling(
    {
      fetchData: async () => {
        try {
          const applications = await get(
            "/v1/projects/{projectId}/metrics",
            { projectId },
            {},
            200
          );
          return applications;
        } catch (error) {
          if (
            error instanceof ErrorWithResponse &&
            error.response.status === 503
          ) {
            return METRICS_SERVER_UNAVAILABLE;
          }
          throw error;
        }
      },
      shouldPollAgain: () => true,
      interval: 60000,
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  const seriesLength = 15;

  const [seriesData, setSeriesData] = useState<{
    memoryUsageMb: Record<string, (null | number)[]>;
    cpuUsage: Record<string, (null | number)[]>;
  }>({
    memoryUsageMb: {},
    cpuUsage: {},
  });

  useEffect(() => {
    setSeriesData({
      memoryUsageMb: {},
      cpuUsage: {},
    });
  }, [projectId]);

  useEffect(() => {
    if (Array.isArray(data)) {
      setSeriesData((prev) => {
        const memoryUsageMb = {};
        const cpuUsage = {};
        for (const app of data) {
          for (const pod of app.pods) {
            memoryUsageMb[pod.id] = prev.memoryUsageMb[pod.id]
              ? [...prev.memoryUsageMb[pod.id]]
              : Array.from({ length: seriesLength }, () => null);
            memoryUsageMb[pod.id].shift();
            memoryUsageMb[pod.id].push(parseFloat(pod.memoryUsageMb));

            cpuUsage[pod.id] = prev.cpuUsage[pod.id]
              ? [...prev.cpuUsage[pod.id]]
              : Array.from({ length: seriesLength }, () => null);
            cpuUsage[pod.id].shift();
            cpuUsage[pod.id].push(parseFloat(pod.cpuUsage));
          }
        }
        return {
          memoryUsageMb,
          cpuUsage,
        };
      });
    }
  }, [data]);

  if (hasData) {
    if (data === METRICS_SERVER_UNAVAILABLE) {
      return (
        <Text color="gray.600">{"Unable to connect to Metrics Server."}</Text>
      );
    }

    return (
      <Stack spacing={4} divider={<Divider borderColor="gray.300" />}>
        <HStack spacing={4}>
          <Text color="gray.600">
            {
              "Refreshed every 60 seconds – Metrics are indicative and not persisted"
            }
          </Text>
          <InlineStatus>metrics</InlineStatus>
        </HStack>
        {data.length === 0 ? (
          <BlankSlate>No apps to show metrics for, yet!</BlankSlate>
        ) : (
          data.map(({ app, pods }, index) => (
            <Stack key={index} spacing={2} pb={4}>
              <Heading size="md">{app.name}</Heading>
              {pods.length === 0 ? (
                <BlankSlate>No resources</BlankSlate>
              ) : (
                pods.map((pod, podIndex) => (
                  <HStack key={podIndex} spacing={4}>
                    <InlineMetricsChart
                      seriesLength={seriesLength}
                      series={seriesData.memoryUsageMb[pod.id] || []}
                      max={parseFloat(pod.memoryLimitMb)}
                    />
                    <Stack spacing={0}>
                      <Text>{`${pod.memoryUsageMb} Mb`}</Text>
                      <Text color="gray.600">{`of ${pod.memoryLimitMb} Mb`}</Text>
                    </Stack>
                    <InlineMetricsChart
                      seriesLength={seriesLength}
                      series={seriesData.cpuUsage[pod.id] || []}
                      max={parseFloat(pod.cpuLimit)}
                    />
                    <Stack spacing={0}>
                      <Text>{`${pod.cpuUsage} CPU`}</Text>
                      <Text color="gray.600">{`of ${pod.cpuLimit} CPU`}</Text>
                    </Stack>
                  </HStack>
                ))
              )}
            </Stack>
          ))
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

const MetricsPage: React.FC = () => {
  const project = useProject();

  return (
    <>
      <Helmet>
        <title>Metrics - {project.name} - Shipmight</title>
      </Helmet>
      <ApplicationMetrics projectId={project.id} />
    </>
  );
};

export default MetricsPage;
