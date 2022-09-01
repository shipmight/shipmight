import { DeleteIcon, EditIcon, LockIcon } from "@chakra-ui/icons";
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
  Tooltip,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { Card } from "./card";

type Registry = components["schemas"]["Registry"];

export const RegistryCard: React.FC<{
  registry: Registry;
  onEdit?: () => void;
  onDelete?: () => void;
  cannotDeleteReason?: string;
}> = ({ registry, onEdit, onDelete, cannotDeleteReason }) => {
  return (
    <HStack>
      <Card body>
        <HStack spacing={4} justify="space-between">
          <Text fontWeight="medium">{registry.name}</Text>
          <Text color="gray.700">{registry.url}</Text>
          {registry.authMethod === "TOKEN" && (
            <Tooltip label="Has auth token" fontSize="sm" placement="top">
              <LockIcon height={4} color="gray.500" />
            </Tooltip>
          )}
          <HStack spacing={2} flex="1" justify="end">
            {onEdit && (
              <Button variant="ghost" size="xs" onClick={onEdit}>
                <EditIcon />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                colorScheme="red"
                size="xs"
                onClick={onDelete}
                isDisabled={!!cannotDeleteReason}
                title={cannotDeleteReason ? cannotDeleteReason : ""}
              >
                <DeleteIcon />
              </Button>
            )}
          </HStack>
        </HStack>
      </Card>
    </HStack>
  );
};

export const DeleteRegistryModal: React.FC<{
  registry: Registry;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}> = ({ registry, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Modal isOpen onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete registry</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <Text>
              {"Are you sure you want to delete "}
              <Text as="span" fontWeight="semibold">
                {registry.name}
              </Text>
              {"?"}
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
