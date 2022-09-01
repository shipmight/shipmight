import {
  Button,
  Text,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  useDisclosure,
  Divider,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { components } from "../../../backend/api/generated/apiSchema";
import { del, get, post } from "../apiFetch";
import { BackButton, CreateButton } from "../components/button";
import { ErrorBoundary, ErrorView } from "../components/error";
import { BlankSlate, LoadingSpinner, LoadingView } from "../components/loading";
import { Page } from "../components/page";
import { DeleteRegistryModal, RegistryCard } from "../components/registries";
import { linkedToText } from "../utils/text";
import useSimplePolling from "../utils/useSimplePolling";
import AddRegistryForm from "./AddRegistryForm";
import SelfUpdate from "./SelfUpdate";
import { useServiceObj } from "./GlobalStateWrapper";
import {
  DeleteMasterDomainModal,
  MasterDomainCard,
} from "../components/masterDomains";
import { DeleteUserModal, UserCard } from "../components/users";
import CreateUserForm from "./CreateUserForm";

const AddDockerHubButton: React.FC<{
  registries: components["schemas"]["Registry"][];
  onCreate: () => void;
}> = ({ registries, onCreate }) => {
  const dockerHub = {
    name: "Docker Hub",
    url: "docker.io",
    authToken: "",
  };

  if (registries.some((registry) => registry.url === dockerHub.url)) {
    return null;
  }

  return (
    <CreateButton
      onClick={async () => {
        await post("/v1/registries", {}, {}, dockerHub, 201);
        onCreate();
      }}
    >
      Add Docker Hub
    </CreateButton>
  );
};

const Registries: React.FC = () => {
  const createModalVisibility = useDisclosure();
  const [registryToEdit, setRegistryToEdit] =
    useState<components["schemas"]["Registry"]>();
  const [registryToDelete, setRegistryToDelete] =
    useState<components["schemas"]["Registry"]>();

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
        const [registries, linkedApps] = await Promise.all([
          get("/v1/registries", {}, {}, 200),
          get("/v1/registries-in-apps", {}, {}, 200),
        ]);
        return { registries, linkedApps };
      },
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  if (hasData) {
    const { registries, linkedApps } = data;
    return (
      <Stack spacing={4}>
        <HStack spacing={2}>
          <Heading size="lg">Registries</Heading>
          <InlineStatus>registries</InlineStatus>
        </HStack>
        {registries.length === 0 ? (
          <BlankSlate>No registries.</BlankSlate>
        ) : (
          <Stack spacing={2}>
            {registries.map((registry) => {
              let cannotDeleteReason: string;
              if (linkedApps[registry.id] && linkedApps[registry.id].length) {
                cannotDeleteReason = linkedToText(
                  "Registry is linked to app",
                  "Registry is linked to apps",
                  linkedApps[registry.id].map((app) => app.name)
                );
              }
              return (
                <RegistryCard
                  key={registry.id}
                  registry={registry}
                  onEdit={() => setRegistryToEdit(registry)}
                  onDelete={() => setRegistryToDelete(registry)}
                  cannotDeleteReason={cannotDeleteReason}
                />
              );
            })}
          </Stack>
        )}
        <HStack>
          <CreateButton onClick={createModalVisibility.onOpen}>
            Add registry
          </CreateButton>
          <AddDockerHubButton registries={registries} onCreate={load} />
          <Modal
            isOpen={createModalVisibility.isOpen}
            onClose={createModalVisibility.onClose}
            closeOnOverlayClick={false}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Add registry</ModalHeader>
              <ModalBody pb={8}>
                <AddRegistryForm
                  onCancel={createModalVisibility.onClose}
                  onSubmit={async (data) => {
                    await post("/v1/registries", {}, {}, data, 201);
                    createModalVisibility.onClose();
                    load();
                  }}
                />
              </ModalBody>
              <ModalCloseButton />
            </ModalContent>
          </Modal>
        </HStack>
        <Modal
          isOpen={!!registryToEdit}
          onClose={() => setRegistryToEdit(undefined)}
        >
          <ModalOverlay />
          {registryToEdit && (
            <ModalContent>
              <ModalHeader>{registryToEdit.name}</ModalHeader>
              <ModalBody pb={8}>
                <AddRegistryForm
                  onCancel={() => setRegistryToEdit(undefined)}
                  initialValues={{
                    name: registryToEdit.name,
                    url: registryToEdit.url,
                    authMethod: registryToEdit.authMethod,
                  }}
                  onSubmit={async (data) => {
                    await post(
                      "/v1/registries/{registryId}",
                      { registryId: registryToEdit.id },
                      {},
                      data,
                      200
                    );
                    setRegistryToEdit(undefined);
                    load();
                  }}
                />
              </ModalBody>
              <ModalCloseButton />
            </ModalContent>
          )}
        </Modal>
        {registryToDelete && (
          <DeleteRegistryModal
            registry={registryToDelete}
            onClose={() => setRegistryToDelete(undefined)}
            onSubmit={async () => {
              await del(
                "/v1/registries/{registryId}",
                { registryId: registryToDelete.id },
                {},
                204
              );
              setRegistryToDelete(undefined);
              load();
            }}
          />
        )}
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Registries</Heading>
        <LoadingView minHeight="60px" />
      </Stack>
    );
  }

  if (hasErrored) {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Registries</Heading>
        <ErrorView retry={() => retry()} errors={subsequentErrors} />
      </Stack>
    );
  }

  return null;
};

const MasterDomains: React.FC = () => {
  const [masterDomainToDelete, setMasterDomainToDelete] =
    useState<components["schemas"]["MasterDomain"]>();

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
        const [masterDomains, linkedProjects] = await Promise.all([
          get("/v1/master-domains", {}, {}, 200),
          get("/v1/master-domains-in-projects", {}, {}, 200),
        ]);
        return { masterDomains, linkedProjects };
      },
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  if (hasData) {
    const { masterDomains, linkedProjects } = data;
    return (
      <Stack spacing={4}>
        <HStack spacing={2}>
          <Heading size="lg">Master domains</Heading>
          <InlineStatus>master domains</InlineStatus>
        </HStack>
        {masterDomains.length === 0 ? (
          <BlankSlate>No master domains.</BlankSlate>
        ) : (
          <Stack spacing={2}>
            {masterDomains.map((masterDomain) => {
              let cannotDeleteReason: string;
              if (
                linkedProjects[masterDomain.hostname] &&
                linkedProjects[masterDomain.hostname].length
              ) {
                cannotDeleteReason = linkedToText(
                  "Domain is active in a project",
                  "Domain is active in projects",
                  linkedProjects[masterDomain.hostname].map(
                    (project) => project.name
                  )
                );
              }
              return (
                <MasterDomainCard
                  key={masterDomain.hostname}
                  masterDomain={masterDomain}
                  onDelete={() => setMasterDomainToDelete(masterDomain)}
                  cannotDeleteReason={cannotDeleteReason}
                />
              );
            })}
          </Stack>
        )}
        <HStack>
          <Text>
            Domains from all projects appear here. New domains can be added in a
            projects Network-tab.
          </Text>
        </HStack>
        {masterDomainToDelete && (
          <DeleteMasterDomainModal
            masterDomain={masterDomainToDelete}
            onClose={() => setMasterDomainToDelete(undefined)}
            onSubmit={async () => {
              await del(
                "/v1/master-domains/{masterDomainHostname}",
                { masterDomainHostname: masterDomainToDelete.hostname },
                {},
                204
              );
              setMasterDomainToDelete(undefined);
              load();
            }}
          />
        )}
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Master domains</Heading>
        <LoadingView minHeight="60px" />
      </Stack>
    );
  }

  if (hasErrored) {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Master domains</Heading>
        <ErrorView retry={() => retry()} errors={subsequentErrors} />
      </Stack>
    );
  }

  return null;
};

const Users: React.FC = () => {
  const createModalVisibility = useDisclosure();
  const [memoedPasswords, setMemoedPasswords] = useState<{
    [userId: string]: string;
  }>({});
  const [userToDelete, setUserToDelete] =
    useState<components["schemas"]["User"]>();

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
        const [users, me] = await Promise.all([
          get("/v1/users", {}, {}, 200),
          get("/v1/me", {}, {}, 200),
        ]);
        return { users, me };
      },
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  if (hasData) {
    const { users, me } = data;
    return (
      <Stack spacing={4}>
        <HStack spacing={2}>
          <Heading size="lg">Users</Heading>
          <InlineStatus>users</InlineStatus>
        </HStack>
        {users.length === 0 ? (
          <BlankSlate>No users.</BlankSlate>
        ) : (
          <Stack spacing={2}>
            {users.map((user) => {
              let cannotDeleteReason: string;
              if (user.username === me.username) {
                cannotDeleteReason = "You cannot delete your own user";
              }
              return (
                <UserCard
                  key={user.id}
                  user={user}
                  onDelete={() => setUserToDelete(user)}
                  cannotDeleteReason={cannotDeleteReason}
                  justCreatedPassword={memoedPasswords[user.id]}
                  closeJustCreatedPassword={() => {
                    setMemoedPasswords((obj) => {
                      return {
                        ...obj,
                        [user.id]: undefined,
                      };
                    });
                  }}
                />
              );
            })}
          </Stack>
        )}
        <HStack>
          <CreateButton onClick={createModalVisibility.onOpen}>
            Create user
          </CreateButton>
          <Modal
            isOpen={createModalVisibility.isOpen}
            onClose={createModalVisibility.onClose}
            closeOnOverlayClick={false}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Create user</ModalHeader>
              <ModalBody pb={8}>
                <CreateUserForm
                  onCancel={createModalVisibility.onClose}
                  onSubmit={async (data) => {
                    const createdUser = await post(
                      "/v1/users",
                      {},
                      {},
                      data,
                      201
                    );
                    setMemoedPasswords((obj) => {
                      return {
                        ...obj,
                        [createdUser.id]: createdUser.password,
                      };
                    });
                    createModalVisibility.onClose();
                    load();
                  }}
                />
              </ModalBody>
              <ModalCloseButton />
            </ModalContent>
          </Modal>
        </HStack>
        {userToDelete && (
          <DeleteUserModal
            user={userToDelete}
            onClose={() => setUserToDelete(undefined)}
            onSubmit={async () => {
              await del(
                "/v1/users/{userId}",
                { userId: userToDelete.id },
                {},
                204
              );
              setUserToDelete(undefined);
              load();
            }}
          />
        )}
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Users</Heading>
        <LoadingView minHeight="60px" />
      </Stack>
    );
  }

  if (hasErrored) {
    return (
      <Stack spacing={4}>
        <Heading size="lg">Users</Heading>
        <ErrorView retry={() => retry()} errors={subsequentErrors} />
      </Stack>
    );
  }

  return null;
};

const Diagnostics: React.FC = () => {
  const lokiServiceObj = useServiceObj("loki");
  const buttonProps = !lokiServiceObj.isEnabled
    ? {
        isDisabled: true,
        title: "Log backend (Loki) not enabled",
      }
    : {
        as: Link,
      };

  return (
    <Stack spacing={4}>
      <HStack spacing={2}>
        <Heading size="lg">Diagnostics</Heading>
      </HStack>
      <HStack spacing={2}>
        <Button
          to="/manage/logs/shipmight"
          colorScheme="gray"
          variant="outline"
          {...buttonProps}
        >
          Shipmight logs
        </Button>
        <Button
          to="/manage/logs/kube-system"
          colorScheme="gray"
          variant="outline"
          {...buttonProps}
        >
          kube-system logs
        </Button>
      </HStack>
    </Stack>
  );
};

const ShipmightInfo: React.FC = () => {
  const uiVersion = `${process.env.SHIPMIGHT_VERSION} (${process.env.SHIPMIGHT_COMMIT})`;
  const [apiVersion, setApiVersion] = useState<string>();

  useEffect(() => {
    get("/v1/version", {}, {}, 200).then(({ version, commit }) => {
      setApiVersion(`${version} (${commit})`);
    });
  }, []);

  return (
    <Stack spacing={4}>
      <HStack spacing={2} color="gray.500" fontSize="sm">
        <Text>Shipmight</Text>
        <Text>
          {"API "}
          {apiVersion || <LoadingSpinner isIndeterminate size={3} />}
        </Text>
        <Text>UI {uiVersion}</Text>
        <Text>
          <Link to="/license">View License (GNU AGPLv3)</Link>
        </Text>
      </HStack>
    </Stack>
  );
};

const ManagePage: React.FC = () => {
  const upgradeLock = useSimplePolling(
    {
      fetchData: async () => {
        const upgradeLock = await get("/v1/upgrade-lock", {}, {}, 200);
        return upgradeLock;
      },
      shouldPollAgain: (data) => data !== null,
      interval: 5000,
    },
    []
  );

  useEffect(() => {
    upgradeLock.load();
  }, []);

  return (
    <Page>
      <Helmet>
        <title>Manage - Shipmight</title>
      </Helmet>
      <Stack
        spacing={8}
        divider={
          <Divider width="30px" borderWidth="3px" borderColor="gray.300" />
        }
      >
        <HStack>
          <BackButton as={Link} to="/">
            Back to project
          </BackButton>
        </HStack>
        <ErrorBoundary>
          <Registries />
        </ErrorBoundary>
        <ErrorBoundary>
          <MasterDomains />
        </ErrorBoundary>
        <ErrorBoundary>
          <Users />
        </ErrorBoundary>
        <ErrorBoundary>
          <Diagnostics />
        </ErrorBoundary>
        <ErrorBoundary>
          <Stack spacing={4}>
            <HStack spacing={2}>
              <Heading size="lg">Update</Heading>
            </HStack>
            <SelfUpdate upgradeLock={upgradeLock} />
          </Stack>
        </ErrorBoundary>
        <ErrorBoundary>
          <ShipmightInfo />
        </ErrorBoundary>
      </Stack>
    </Page>
  );
};

export default ManagePage;
