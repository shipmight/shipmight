import { Stack, Text } from "@chakra-ui/react";
import React from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { ErrorView } from "../components/error";
import { useApp } from "./AppRoute";
import { useAppChart } from "./AppChartRoute";
import InlineLogBox from "./InlineLogBox";
import { useProject } from "./ProjectRoute";
import { useServiceObj } from "./GlobalStateWrapper";

const isLogViewerTabSpec = (
  obj: components["schemas"]["ShipmightYaml"]["tabs"][number]["content"]
): obj is components["schemas"]["LogViewerTabSpec"] => obj.type === "LogViewer";

const LogViewer: React.FC<{
  tabId: string;
}> = ({ tabId }) => {
  const project = useProject();
  const appChart = useAppChart();
  const app = useApp();
  const lokiServiceObj = useServiceObj("loki");

  if (!lokiServiceObj.isEnabled) {
    return <Text>Log backend not available.</Text>;
  }

  const tabSpec = appChart.spec.tabs.find(
    (tab) => tab.id === tabId && tab.content.type === "LogViewer"
  );

  if (!tabSpec || !isLogViewerTabSpec(tabSpec.content)) {
    return <ErrorView />;
  }
  const { logTargetId } = tabSpec.content;

  const logTargetIndex = appChart.spec.logTargets.findIndex(
    (item) => item.id === logTargetId
  );

  const logSourceId = `${app.id}-${logTargetIndex}`;

  return (
    <Stack spacing={4}>
      <InlineLogBox projectId={project.id} logSourceId={logSourceId} />
    </Stack>
  );
};

export default LogViewer;
