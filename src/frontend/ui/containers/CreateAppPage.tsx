import { Heading, HStack, Stack, useToast } from "@chakra-ui/react";
import React from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { post } from "../apiFetch";
import { BackButton } from "../components/button";
import AppFieldsForm from "./AppFieldsForm";
import { useAppChart } from "./AppChartRoute";
import { useProject } from "./ProjectRoute";

const CreateAppPage: React.FC = () => {
  const project = useProject();
  const appChart = useAppChart();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>
          Create {appChart.spec.terminology.singular} - {project.name} -
          Shipmight
        </title>
      </Helmet>
      <Stack spacing={4}>
        <HStack>
          <BackButton as={Link} to="..">
            Back to {appChart.spec.terminology.plural}
          </BackButton>
        </HStack>
        <Heading>Create {appChart.spec.terminology.singular}</Heading>
        <AppFieldsForm
          projectId={project.id}
          appChart={appChart}
          cards={appChart.spec.configurationCards}
          cancelUrl=".."
          submitText={`Create ${appChart.spec.terminology.singular}`}
          onSubmit={async (data: { [key: string]: unknown; name: string }) => {
            const app = await post(
              "/v1/projects/{projectId}/apps",
              { projectId: project.id },
              { appChartId: appChart.id },
              data,
              201
            );
            toast({
              title: `${appChart.spec.terminology.singularCapitalized} created`,
              status: "success",
              duration: 5000,
              isClosable: true,
              position: "bottom-right",
            });
            navigate(`../${app.id}`);
          }}
        />
      </Stack>
    </>
  );
};

export default CreateAppPage;
