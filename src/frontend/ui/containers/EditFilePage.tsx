import { HStack, Stack, useToast } from "@chakra-ui/react";
import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { get, post } from "../apiFetch";
import { BackButton } from "../components/button";
import { ErrorView } from "../components/error";
import { LoadingView } from "../components/loading";
import useSimplePolling from "../utils/useSimplePolling";
import CreateFileForm from "./CreateFileForm";
import { useProject } from "./ProjectRoute";

const EditFilePage: React.FC = () => {
  const project = useProject();
  const toast = useToast();
  const { fileId } = useParams();

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
        const file = await get("/v1/files/{fileId}", { fileId }, {}, 200);
        return file;
      },
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  if (hasData) {
    return (
      <>
        <Helmet>
          <title>
            Edit {data.name} - {project.name} - Shipmight
          </title>
        </Helmet>
        <Stack spacing={4}>
          <HStack>
            <BackButton as={Link} to="..">
              Back to files
            </BackButton>
          </HStack>
          <CreateFileForm
            initialValues={{
              name: data.name,
              isSecret: data.isSecret,
              content: data.content,
            }}
            onSubmit={async (values) => {
              await post(
                "/v1/files/{fileId}",
                { fileId: data.id },
                {},
                values,
                200
              );
              toast({
                title: `Changes saved to ${data.name}`,
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom-right",
              });
            }}
          />
        </Stack>
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

export default EditFilePage;
