import {
  Button,
  FormControl,
  FormErrorMessage,
  HStack,
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { components } from "../../../backend/api/generated/apiSchema";

export const DeleteDeployHookModal: React.FC<{
  deployHook: components["schemas"]["DeployHook"];
  onClose: () => void;
  onSubmit: () => Promise<void>;
}> = ({ deployHook, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Modal isOpen onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete deploy hook</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <Text>
              {"Are you sure you want to delete "}
              <Text as="span" fontWeight="semibold">
                {deployHook.name}
              </Text>
              {"?"}
            </Text>
            <Text>
              Any automations using this hook will cease working instantly.
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
