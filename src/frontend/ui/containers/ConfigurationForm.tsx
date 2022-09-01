import { useToast } from "@chakra-ui/react";
import React from "react";
import { post } from "../apiFetch";
import AppFieldsForm from "./AppFieldsForm";
import { useApp, useUpdateApp } from "./AppRoute";
import { useAppChart } from "./AppChartRoute";
import { useProject } from "./ProjectRoute";

const ConfigurationForm: React.FC = () => {
  const project = useProject();
  const appChart = useAppChart();
  const app = useApp();
  const updateApp = useUpdateApp();
  const toast = useToast();

  return (
    <>
      <AppFieldsForm
        projectId={project.id}
        appChart={appChart}
        cards={appChart.spec.configurationCards}
        values={app.values}
        submitText="Save changes"
        onSubmit={async (data: { [key: string]: unknown; name: string }) => {
          const updated = await post(
            "/v1/apps/{appId}",
            { appId: app.id },
            {},
            data,
            200
          );
          updateApp(updated);
          toast({
            title: `${appChart.spec.terminology.singularCapitalized} updated`,
            status: "success",
            duration: 5000,
            isClosable: true,
            position: "bottom-right",
          });
        }}
      />
    </>
  );
};

export default ConfigurationForm;
