import { Stack, HStack, Divider } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { components } from "../../../backend/api/generated/apiSchema";
import { del, get } from "../apiFetch";
import { CreateButton } from "../components/button";
import { ErrorBoundary, ErrorView } from "../components/error";
import { DeleteFileModal, FileListItem } from "../components/files";
import { BlankSlate, LoadingView } from "../components/loading";
import { linkedToText } from "../utils/text";
import useSimplePolling from "../utils/useSimplePolling";
import { useProject } from "./ProjectRoute";

const FileList: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [fileToDelete, setFileToDelete] =
    useState<components["schemas"]["File"]>();

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
        const [files, linkedApps] = await Promise.all([
          get("/v1/projects/{projectId}/files", { projectId }, {}, 200),
          get(
            "/v1/projects/{projectId}/files/linked-apps",
            { projectId },
            {},
            200
          ),
        ]);
        return { files, linkedApps };
      },
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  if (hasData) {
    const { files, linkedApps } = data;
    return (
      <Stack spacing={4}>
        <HStack spacing={4}>
          <CreateButton
            as={Link}
            isEmphasized={!files.length}
            size="sm"
            to="create"
          >
            {files.length ? "Create" : "Create file"}
          </CreateButton>
        </HStack>
        {files.length === 0 ? (
          <BlankSlate>No files, yet!</BlankSlate>
        ) : (
          <Stack spacing={0} divider={<Divider borderColor="gray.200" />}>
            {files.map((file, index) => {
              let cannotDeleteReason: string;
              if (linkedApps[file.id] && linkedApps[file.id].length) {
                cannotDeleteReason = linkedToText(
                  "File is mounted to app",
                  "File is mounted to apps",
                  linkedApps[file.id].map((app) => app.name)
                );
              }
              return (
                <ErrorBoundary key={index}>
                  <FileListItem
                    file={file}
                    editUrl={file.id}
                    onDelete={() => setFileToDelete(file)}
                    cannotDeleteReason={cannotDeleteReason}
                  />
                </ErrorBoundary>
              );
            })}
          </Stack>
        )}
        {fileToDelete && (
          <DeleteFileModal
            file={fileToDelete}
            onClose={() => setFileToDelete(undefined)}
            onSubmit={async () => {
              await del(
                "/v1/files/{fileId}",
                { fileId: fileToDelete.id },
                {},
                204
              );
              setFileToDelete(undefined);
              load();
            }}
          />
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

const FilesPage: React.FC = () => {
  const project = useProject();

  return (
    <>
      <Helmet>
        <title>Files - {project.name} - Shipmight</title>
      </Helmet>
      <FileList projectId={project.id} />
    </>
  );
};

export default FilesPage;
