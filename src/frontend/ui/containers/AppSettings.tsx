import { DeleteIcon } from "@chakra-ui/icons";
import {
  Stack,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  useToast,
  Divider,
  HStack,
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Input,
} from "@chakra-ui/react";
import { formatDistance } from "date-fns";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { components } from "../../../backend/api/generated/apiSchema";
import { del, get, post } from "../apiFetch";
import { DeleteAppModal } from "../components/apps";
import { Card } from "../components/card";
import { DeleteDeployHookModal } from "../components/deployHooks";
import { ErrorBoundary, ErrorView } from "../components/error";
import { KeyIcon } from "../components/icon";
import { BlankSlate, LoadingView } from "../components/loading";
import { linkedToText } from "../utils/text";
import useSimplePolling from "../utils/useSimplePolling";
import AddDeployHookForm from "./AddDeployHookForm";
import { useAppChart } from "./AppChartRoute";
import { useApp } from "./AppRoute";

const DeployKeys: React.FC = () => {
  const app = useApp();
  const createModalVisibility = useDisclosure();
  const [deployHookToDelete, setDeployHookToDelete] =
    useState<components["schemas"]["DeployHook"]>();
  const [memoedTokens, setMemoedTokens] = useState<{
    [deployHookId: string]: string;
  }>({});

  const { load, data, isLoading, hasErrored, retry, subsequentErrors } =
    useSimplePolling(
      {
        fetchData: async () => {
          const deployHooks = await get(
            "/v1/apps/{appId}/deploy-hooks",
            { appId: app.id },
            {},
            200
          );
          return deployHooks;
        },
      },
      [app.id]
    );

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Card body>
        <Stack spacing={2}>
          <FormControl>
            <FormLabel>Deploy hooks</FormLabel>
            <FormHelperText>
              Used for triggering a deployment via the API.
            </FormHelperText>
          </FormControl>
          {isLoading ? (
            <LoadingView minHeight="60px" />
          ) : hasErrored ? (
            <ErrorView retry={() => retry()} errors={subsequentErrors} />
          ) : data.length === 0 ? (
            <BlankSlate>No deploy hooks, yet!</BlankSlate>
          ) : (
            <Stack
              my={4}
              spacing={2}
              divider={<Divider borderColor="gray.200" />}
            >
              {data.map((deployHook) => (
                <HStack
                  key={deployHook.id}
                  spacing={2}
                  justifyContent="start"
                  alignItems="start"
                >
                  <KeyIcon boxSize={2} color="gray.500" my="6px" />
                  <Stack spacing={0}>
                    <Text fontSize="sm">{deployHook.name}</Text>
                    <HStack spacing={3} fontSize="sm" color="gray.500">
                      <Text>
                        {"Created "}
                        <span title={deployHook.createdAt}>
                          {formatDistance(
                            new Date(deployHook.createdAt),
                            new Date()
                          )}
                        </span>
                        {" ago"}
                      </Text>
                      {deployHook.lastUsedAt ? (
                        <Text>
                          {"Last used "}
                          <span title={deployHook.lastUsedAt}>
                            {formatDistance(
                              new Date(deployHook.lastUsedAt),
                              new Date()
                            )}
                          </span>
                          {" ago"}
                        </Text>
                      ) : (
                        <Text>Never used</Text>
                      )}
                    </HStack>
                    {memoedTokens[deployHook.id] && (
                      <HStack
                        spacing={2}
                        fontSize="sm"
                        bg="yellow.200"
                        borderRadius="3px"
                        py={1}
                        px={2}
                      >
                        <Input
                          size="sm"
                          fontFamily="var(--font-family-monospace)"
                          borderColor="yellow.300"
                          bg="yellow.300"
                          readOnly
                          value={memoedTokens[deployHook.id]}
                        />
                        <Text>This token will not be shown again.</Text>
                      </HStack>
                    )}
                  </Stack>
                  <HStack spacing={2} justify="end" flex="1">
                    <Button
                      variant="ghost"
                      colorScheme="red"
                      size="xs"
                      title={`Delete ${deployHook.name}`}
                      onClick={() => setDeployHookToDelete(deployHook)}
                    >
                      <DeleteIcon />
                    </Button>
                  </HStack>
                </HStack>
              ))}
            </Stack>
          )}
          <HStack>
            <Button
              size="xs"
              colorScheme="gray"
              variant="outline"
              onClick={createModalVisibility.onOpen}
            >
              Create deploy hook
            </Button>
            <Modal
              isOpen={createModalVisibility.isOpen}
              onClose={createModalVisibility.onClose}
              closeOnOverlayClick={false}
            >
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Create deploy hook</ModalHeader>
                <ModalBody pb={8}>
                  <AddDeployHookForm
                    onCancel={createModalVisibility.onClose}
                    onSubmit={async (data) => {
                      const deployHook = await post(
                        "/v1/apps/{appId}/deploy-hooks",
                        { appId: app.id },
                        {},
                        data,
                        201
                      );
                      setMemoedTokens((obj) => ({
                        ...obj,
                        [deployHook.id]: deployHook.token,
                      }));
                      createModalVisibility.onClose();
                      load();
                    }}
                  />
                </ModalBody>
                <ModalCloseButton />
              </ModalContent>
            </Modal>
          </HStack>
        </Stack>
      </Card>
      {deployHookToDelete && (
        <DeleteDeployHookModal
          deployHook={deployHookToDelete}
          onClose={() => setDeployHookToDelete(undefined)}
          onSubmit={async () => {
            await del(
              "/v1/deploy-hooks/{deployHookId}",
              { deployHookId: deployHookToDelete.id },
              {},
              204
            );
            setDeployHookToDelete(undefined);
            load();
          }}
        />
      )}
    </>
  );
};

const DeleteApp: React.FC = () => {
  const app = useApp();
  const appChart = useAppChart();
  const toast = useToast();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { load, hasData, data, hasErrored, retry, subsequentErrors } =
    useSimplePolling(
      {
        fetchData: async () => {
          const domains = await get(
            "/v1/apps/{appId}/domains",
            { appId: app.id },
            {},
            200
          );
          return domains;
        },
      },
      []
    );

  useEffect(() => {
    load();
  }, [app.id]);

  let cannotDeleteReason: string;
  if (hasData && data.length > 0) {
    cannotDeleteReason = linkedToText(
      `${appChart.spec.terminology.singularCapitalized} cannot be deleted while it is connected to a domain`,
      `${appChart.spec.terminology.singularCapitalized} cannot be deleted while it is connected to domains`,
      data.map((domain) => domain.hostname)
    );
  }

  if (hasErrored) {
    return <ErrorView retry={() => retry()} errors={subsequentErrors} />;
  }

  return (
    <>
      <Card body>
        <FormControl>
          <FormLabel>Delete {appChart.spec.terminology.singular}</FormLabel>
          <Button
            colorScheme="red"
            onClick={() => setShowDeleteModal(true)}
            isLoading={!hasData}
            isDisabled={!!cannotDeleteReason}
          >
            Delete this {appChart.spec.terminology.singular}
          </Button>
          <FormHelperText>
            {cannotDeleteReason ||
              "Opens a confirmation popup before deleting."}
          </FormHelperText>
        </FormControl>
      </Card>
      {showDeleteModal && (
        <DeleteAppModal
          app={app}
          terminology={appChart.spec.terminology}
          onClose={() => setShowDeleteModal(false)}
          onSubmit={async () => {
            await del("/v1/apps/{appId}", { appId: app.id }, {}, 204);
            toast({
              title: `${appChart.spec.terminology.singularCapitalized} deleted`,
              status: "success",
              duration: 5000,
              isClosable: true,
              position: "bottom-right",
            });
            navigate("../..");
          }}
        />
      )}
    </>
  );
};

const AppSettings: React.FC = () => {
  return (
    <Stack spacing={4}>
      <ErrorBoundary>
        <DeployKeys />
      </ErrorBoundary>
      <ErrorBoundary>
        <DeleteApp />
      </ErrorBoundary>
    </Stack>
  );
};

export default AppSettings;
