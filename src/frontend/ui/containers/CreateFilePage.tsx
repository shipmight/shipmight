import { Heading, HStack, Stack, useToast } from "@chakra-ui/react";
import React from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { post } from "../apiFetch";
import { BackButton } from "../components/button";
import CreateFileForm from "./CreateFileForm";
import { useProject } from "./ProjectRoute";

const CreateFilePage: React.FC = () => {
  const project = useProject();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Create file - {project.name} - Shipmight</title>
      </Helmet>
      <Stack spacing={4}>
        <HStack>
          <BackButton as={Link} to="..">
            Back to files
          </BackButton>
        </HStack>
        <Heading>Create file</Heading>
        <CreateFileForm
          cancelUrl=".."
          onSubmit={async (data) => {
            await post(
              "/v1/projects/{projectId}/files",
              { projectId: project.id },
              {},
              data,
              201
            );
            toast({
              title: "File created",
              status: "success",
              duration: 5000,
              isClosable: true,
              position: "bottom-right",
            });
            navigate("..");
          }}
        />
      </Stack>
    </>
  );
};

export default CreateFilePage;
