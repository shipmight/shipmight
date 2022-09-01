import {
  Stack,
  Heading,
  useDisclosure,
  HStack,
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Button,
  FormControl,
  FormErrorMessage,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { components } from "../../../backend/api/generated/apiSchema";
import { del, get, post } from "../apiFetch";
import { CreateButton } from "../components/button";
import { DomainCard } from "../components/domains";
import { ErrorView } from "../components/error";
import { BlankSlate, LoadingView } from "../components/loading";
import useSimplePolling from "../utils/useSimplePolling";
import AddDomainForm from "./AddDomainForm";
import { useProject } from "./ProjectRoute";

const DomainList: React.FC<{ projectId: string }> = ({ projectId }) => {
  const addDomainVisibility = useDisclosure();
  const [domainToEdit, setDomainToEdit] =
    useState<components["schemas"]["Domain"]>();
  const [domainToDelete, setDomainToDelete] =
    useState<components["schemas"]["Domain"]>();
  const [domainDeletionError, setDomainDeletionError] = useState<string>();

  const getRelatedData = async () => {
    const [allAppCharts, allApps] = await Promise.all([
      get("/v1/app-charts", {}, {}, 200),
      get("/v1/projects/{projectId}/apps", { projectId }, {}, 200),
    ]);

    const appCharts = new Map<string, components["schemas"]["AppChart"]>();
    for (const appChart of allAppCharts) {
      appCharts.set(appChart.id, appChart);
    }

    const apps = new Map<string, components["schemas"]["App"]>();
    for (const app of allApps) {
      apps.set(app.id, app);
    }

    return { appCharts, apps };
  };

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
        const [domains, { appCharts, apps }, allMasterDomains] =
          await Promise.all([
            get("/v1/projects/{projectId}/domains", { projectId }, {}, 200),
            getRelatedData(),
            get("/v1/master-domains", {}, {}, 200),
          ]);

        const masterDomains = new Map<
          string,
          components["schemas"]["MasterDomain"]
        >();
        for (const masterDomain of allMasterDomains) {
          masterDomains.set(masterDomain.hostname, masterDomain);
        }

        return { domains, appCharts, apps, masterDomains };
      },
      shouldPollAgain: ({ domains, masterDomains }) =>
        !addDomainVisibility.isOpen &&
        domains.some((domain) => {
          return (
            masterDomains.get(domain.hostname).tlsCertificateStatus ===
            "UPDATING"
          );
        }),
      reloadOnDepsChange: true,
    },
    [addDomainVisibility.isOpen]
  );

  useEffect(() => {
    load();
  }, []);

  const deleteDomain = async (domainId: string): Promise<void> => {
    try {
      await del("/v1/domains/{domainId}", { domainId }, {}, 204);
      setDomainToDelete(undefined);
      load();
    } catch (error) {
      console.error(error);
      setDomainDeletionError("An unexpected error occurred");
    }
  };

  const getTargets: Parameters<typeof AddDomainForm>[0]["getTargets"] =
    async () => {
      const { appCharts, apps } = await getRelatedData();
      return Array.from(apps.values()).flatMap((app) => {
        const appChart = appCharts.get(app.appChartId);
        return appChart.spec.serviceTargets.map((serviceTarget) => {
          const nameFieldValue = app.values[appChart.spec.listCard.nameFieldId];
          let name =
            typeof nameFieldValue === "string" ? nameFieldValue : "(unknown)";
          if (appChart.spec.serviceTargets.length > 1) {
            name += ` (${serviceTarget.name})`;
          }
          return {
            name,
            hash: `${app.id}-${serviceTarget.id}`,
            appId: app.id,
            appServiceTargetId: serviceTarget.id,
          };
        });
      });
    };

  if (hasData) {
    return (
      <Stack spacing={2}>
        <Heading size="md">Domains</Heading>
        {data.domains.length === 0 ? (
          <BlankSlate>No domains, yet!</BlankSlate>
        ) : (
          <Stack spacing={2}>
            {data.domains.map((domain, index) => {
              let target: { name: string; url: string } = undefined;
              if (domain.appId) {
                const app = data.apps.get(domain.appId);
                const appChart = data.appCharts.get(app.appChartId);
                const nameFieldValue =
                  app.values[appChart.spec.listCard.nameFieldId];
                target = {
                  name:
                    typeof nameFieldValue === "string"
                      ? nameFieldValue
                      : "(unknown)",
                  url: `/projects/${app.projectId}/apps/${app.appChartId}/${app.id}`,
                };
              }

              return (
                <DomainCard
                  key={index}
                  domain={domain}
                  masterDomain={data.masterDomains.get(domain.hostname)}
                  target={target}
                  app={domain.appId ? data.apps.get(domain.appId) : undefined}
                  appChart={
                    domain.appId
                      ? data.appCharts.get(
                          data.apps.get(domain.appId).appChartId
                        )
                      : undefined
                  }
                  onEdit={() => {
                    setDomainToEdit(domain);
                  }}
                  onDelete={() => {
                    setDomainToDelete(domain);
                    setDomainDeletionError(undefined);
                  }}
                />
              );
            })}
          </Stack>
        )}
        <HStack>
          <CreateButton onClick={addDomainVisibility.onOpen}>
            Add domain
          </CreateButton>
        </HStack>
        <Modal
          isOpen={addDomainVisibility.isOpen}
          onClose={addDomainVisibility.onClose}
          closeOnOverlayClick={false}
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add domain</ModalHeader>
            <ModalBody pb={8}>
              <AddDomainForm
                getTargets={getTargets}
                onCancel={addDomainVisibility.onClose}
                onSubmit={async (data) => {
                  await post(
                    "/v1/projects/{projectId}/domains",
                    { projectId },
                    {},
                    data,
                    201
                  );
                  addDomainVisibility.onClose();
                  load();
                }}
              />
            </ModalBody>
            <ModalCloseButton />
          </ModalContent>
        </Modal>
        <Modal
          isOpen={!!domainToEdit}
          onClose={() => setDomainToEdit(undefined)}
        >
          <ModalOverlay />
          {domainToEdit && (
            <ModalContent>
              <ModalHeader>Edit domain</ModalHeader>
              <ModalBody pb={8}>
                <AddDomainForm
                  getTargets={getTargets}
                  onCancel={() => setDomainToEdit(undefined)}
                  initialValues={domainToEdit}
                  onSubmit={async (data) => {
                    await post(
                      "/v1/domains/{domainId}",
                      { domainId: domainToEdit.id },
                      {},
                      data,
                      200
                    );
                    setDomainToEdit(undefined);
                    load();
                  }}
                />
              </ModalBody>
              <ModalCloseButton />
            </ModalContent>
          )}
        </Modal>
        <Modal
          isOpen={!!domainToDelete}
          onClose={() => setDomainToDelete(undefined)}
        >
          <ModalOverlay />
          {domainToDelete && (
            <ModalContent>
              <ModalHeader>Delete domain</ModalHeader>
              <ModalBody pb={8}>
                <Stack spacing={4}>
                  <Text>
                    {"Are you sure you want to delete "}
                    <Text as="span" fontWeight="semibold">
                      {domainToDelete.hostname}
                    </Text>
                    {"?"}
                  </Text>
                  <HStack spacing={2} justify="space-between">
                    <Button
                      variant="outline"
                      onClick={() => setDomainToDelete(undefined)}
                    >
                      No, cancel
                    </Button>
                    <Button
                      variant="solid"
                      colorScheme="red"
                      onClick={() => deleteDomain(domainToDelete.id)}
                    >
                      Yes, delete
                    </Button>
                  </HStack>
                  {domainDeletionError && (
                    <FormControl isInvalid>
                      <FormErrorMessage>{domainDeletionError}</FormErrorMessage>
                    </FormControl>
                  )}
                </Stack>
              </ModalBody>
              <ModalCloseButton />
            </ModalContent>
          )}
        </Modal>
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Heading size="md">Domains</Heading>
        <LoadingView minHeight="60px" />
      </Stack>
    );
  }

  if (hasErrored) {
    return (
      <Stack spacing={2}>
        <Heading size="md">Domains</Heading>
        <ErrorView retry={() => retry()} errors={subsequentErrors} />
      </Stack>
    );
  }

  return null;
};

const NetworkPage: React.FC = () => {
  const project = useProject();

  return (
    <>
      <Helmet>
        <title>Network - {project.name} - Shipmight</title>
      </Helmet>
      <DomainList projectId={project.id} />
    </>
  );
};

export default NetworkPage;
