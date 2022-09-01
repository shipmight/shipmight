import { Box, Text } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { get } from "../apiFetch";
import { LogBox } from "../components/logs";

const InlineLogBox: React.FC<{
  projectId: string;
  logSourceId: string;
}> = ({ projectId, logSourceId }) => {
  const [data, setData] = useState<string[][]>([]);
  const [loadingFirstData, setLoadingFirstData] = useState(true);
  const [hasErrored, setHasErrored] = useState(false);

  useEffect(() => {
    const initialStartTime = `${
      new Date().getTime() - 1000 * 60 * 60 * 24
    }000000`;

    let hasBeenUnmounted = false;

    let refetchTimeout: NodeJS.Timeout;
    let startNs = BigInt(initialStartTime);

    const addDataAndRefetch = (logs: string[][]) => {
      if (hasBeenUnmounted) {
        return;
      }

      setData((prevLogs) => [...prevLogs, ...logs].slice(-1000));
      setLoadingFirstData(false);
      setHasErrored(false);

      startNs = logs.length
        ? BigInt(logs[logs.length - 1][1]) + BigInt(1)
        : startNs;

      refetchTimeout = setTimeout(() => {
        get(
          "/v1/projects/{projectId}/logs",
          { projectId },
          {
            sources: logSourceId,
            startTime: startNs.toString(),
            endTime: `${new Date().getTime()}000000`,
            limit: "100",
          },
          200
        )
          .then(addDataAndRefetch)
          .catch((error) => {
            console.error(error);
            setHasErrored(true);
          });
      }, 2000);
    };

    get(
      "/v1/projects/{projectId}/logs",
      { projectId },
      {
        sources: logSourceId,
        startTime: `${new Date().getTime()}000000`,
        endTime: initialStartTime,
        limit: "100",
      },
      200
    )
      .then(addDataAndRefetch)
      .catch((error) => {
        console.error(error);
        setHasErrored(true);
      });

    return function cleanup() {
      hasBeenUnmounted = true;
      clearTimeout(refetchTimeout);
    };
  }, []);

  return (
    <Box height="200px">
      <LogBox
        data={data}
        isLoading={loadingFirstData}
        noLogsText="No recent logs"
        viewInLogsUrl={`../../../../logs/?sources=${encodeURIComponent(
          logSourceId
        )}&mode=live`}
      />
      {hasErrored && (
        <Text color="red.600" fontSize="sm">
          Trouble loading logs…
        </Text>
      )}
    </Box>
  );
};

export default InlineLogBox;
