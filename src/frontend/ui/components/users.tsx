import { DeleteIcon } from "@chakra-ui/icons";
import {
  Alert,
  AlertDescription,
  Button,
  CloseButton,
  FormControl,
  FormErrorMessage,
  HStack,
  Input,
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

type User = components["schemas"]["User"];

export const UserCard: React.FC<{
  user: User;
  onDelete?: () => void;
  cannotDeleteReason?: string;
  justCreatedPassword?: string;
  closeJustCreatedPassword: () => void;
}> = ({
  user,
  onDelete,
  cannotDeleteReason,
  justCreatedPassword,
  closeJustCreatedPassword,
}) => {
  return (
    <HStack>
      <Card body>
        <Stack spacing={2}>
          <HStack spacing={4} justify="space-between">
            <Text fontWeight="medium">{user.username}</Text>
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
          {user.mustChangePassword && (
            <Status variant="muted">
              User needs to change password upon next login.
            </Status>
          )}
          {justCreatedPassword && (
            <Alert status="success">
              <Stack spacing={2}>
                <AlertDescription>
                  User has been created. Copy the following password. It will
                  not be shown again. A new password must be chosen upon first
                  login.
                </AlertDescription>
                <Input
                  size="sm"
                  borderColor="green.300"
                  bg="green.300"
                  readOnly
                  value={justCreatedPassword}
                />
              </Stack>
              <CloseButton
                alignSelf="flex-start"
                position="relative"
                right={-1}
                top={-1}
                onClick={closeJustCreatedPassword}
              />
            </Alert>
          )}
        </Stack>
      </Card>
    </HStack>
  );
};

export const DeleteUserModal: React.FC<{
  user: User;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}> = ({ user, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Modal isOpen onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete user</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <Text>
              {"Are you sure you want to delete "}
              <Text as="span" fontWeight="semibold">
                {user.username}
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
