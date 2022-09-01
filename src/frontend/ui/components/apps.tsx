import {
  Button,
  FormControl,
  FormErrorMessage,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { components } from "../../../backend/api/generated/apiSchema";
import { Card } from "./card";
import { DeploymentStatus } from "./deployments";

type App = components["schemas"]["App"];

export const AppCard: React.FC<{
  spec: components["schemas"]["AppChart"]["spec"];
  app: App;
  latestDeployment: components["schemas"]["Deployment"] | undefined;
}> = ({ spec, app, latestDeployment }) => {
  const nameFieldValue =
    typeof app.values[spec.listCard.nameFieldId] === "string"
      ? app.values[spec.listCard.nameFieldId]
      : "(unknown)";

  const extraDetails = Array.isArray(spec.listCard.extraDetailFieldIds)
    ? spec.listCard.extraDetailFieldIds
        .filter(
          (fieldId) =>
            typeof app.values[fieldId] === "string" &&
            app.values[fieldId] !== ""
        )
        .map((fieldId) => app.values[fieldId])
    : [];

  const links = spec.tabs.map((tab) => {
    return {
      text: tab.name,
      path: tab.id,
    };
  });

  links.push({ text: "Settings", path: "settings" });

  let deploymentStatus: React.ReactElement;
  if (latestDeployment) {
    deploymentStatus = <DeploymentStatus {...latestDeployment} />;
  }

  return (
    <HStack>
      <Card body>
        <Stack align="left" spacing={1}>
          <HStack spacing={4}>
            <Text fontWeight="medium">
              <Link to={app.id}>{nameFieldValue}</Link>
            </Text>
            {extraDetails.length > 0 && (
              <HStack fontSize="sm" color="gray.600" spacing={4}>
                {extraDetails.map((value, index) => (
                  <Text key={index}>{value}</Text>
                ))}
              </HStack>
            )}
            {deploymentStatus}
          </HStack>
          <HStack spacing={3}>
            {links.map(({ text, path }, index) => (
              <Button
                key={index}
                as={Link}
                variant="link"
                size="xs"
                to={`${app.id}/${path}`}
              >
                {text}
              </Button>
            ))}
          </HStack>
        </Stack>
      </Card>
    </HStack>
  );
};

export const DeleteAppModal: React.FC<{
  app: App;
  terminology: components["schemas"]["AppChart"]["spec"]["terminology"];
  onClose: () => void;
  onSubmit: () => Promise<void>;
}> = ({ app, terminology, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Modal isOpen onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete {terminology.singular}</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <Text>
              {"Are you sure you want to delete "}
              <Text as="span" fontWeight="semibold">
                {app.name}
              </Text>
              {"?"}
            </Text>
            <Text>
              The {terminology.singular} and its deployments will be deleted
              completely. There is no undo.
            </Text>
            <HStack spacing={2} justify="space-between">
              <Button
                variant="outline"
                onClick={() => onClose()}
                isDisabled={isLoading}
              >
                No, cancel
              </Button>
              <Button
                variant="solid"
                colorScheme="red"
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={async () => {
                  try {
                    setError(undefined);
                    setIsLoading(true);
                    await onSubmit();
                    setIsLoading(false);
                  } catch (error) {
                    console.error(error);
                    setError("An unexpected error occurred");
                    setIsLoading(false);
                  }
                }}
              >
                Yes, delete
              </Button>
            </HStack>
            {error && (
              <FormControl isInvalid>
                <FormErrorMessage>{error}</FormErrorMessage>
              </FormControl>
            )}
          </Stack>
        </ModalBody>
        <ModalCloseButton />
      </ModalContent>
    </Modal>
  );
};
