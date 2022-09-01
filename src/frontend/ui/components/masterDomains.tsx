import { DeleteIcon, LockIcon } from "@chakra-ui/icons";
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
import { components } from "../../../backend/api/generated/apiSchema";
import { Card } from "./card";
import { Status } from "./status";

type MasterDomain = components["schemas"]["MasterDomain"];

export const MasterDomainCard: React.FC<{
  masterDomain: MasterDomain;
  onDelete?: () => void;
  cannotDeleteReason?: string;
}> = ({ masterDomain, onDelete, cannotDeleteReason }) => {
  return (
    <HStack>
      <Card body>
        <HStack spacing={4} justify="space-between">
          <Text fontWeight="medium">{masterDomain.hostname}</Text>
          {masterDomain.tlsCertificateStatus === "UPDATING" && (
            <Status variant="muted" loading>
              TLS
            </Status>
          )}
          {masterDomain.tlsCertificateStatus === "READY" && (
            <Status variant="success" Icon={LockIcon}>
              TLS
            </Status>
          )}
          <HStack spacing={2} flex="1" justify="end">
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

export const DeleteMasterDomainModal: React.FC<{
  masterDomain: MasterDomain;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}> = ({ masterDomain, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Modal isOpen onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete master domain</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <Text>
              {"Are you sure you want to delete "}
              <Text as="span" fontWeight="semibold">
                {masterDomain.hostname}
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
