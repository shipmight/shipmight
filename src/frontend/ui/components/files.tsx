import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  HStack,
  Text,
  Box,
  Button,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  FormControl,
  FormErrorMessage,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { components } from "../../../backend/api/generated/apiSchema";

export const FileListItem: React.FC<{
  file: { id: string; name: string };
  editUrl: string;
  onDelete: () => void;
  cannotDeleteReason?: string;
}> = ({ file, editUrl, onDelete, cannotDeleteReason }) => {
  const [isHighlighted, setIsHighlighted] = useState(false);

  return (
    <HStack
      spacing={4}
      py={2}
      px={2}
      mx={-2}
      justify="space-between"
      borderRadius="3px"
      bg={isHighlighted ? "white" : undefined}
    >
      <HStack spacing={2}>
        <Text>
          <Link to={file.id}>{file.name}</Link>
        </Text>
      </HStack>
      <Box>
        <Menu
          onOpen={() => setIsHighlighted(true)}
          onClose={() => setIsHighlighted(false)}
        >
          <MenuButton
            size="xs"
            as={Button}
            rightIcon={<ChevronDownIcon />}
            variant="outline"
          >
            Actions
          </MenuButton>
          <MenuList>
            <MenuItem as={Link} to={editUrl}>
              Edit file
            </MenuItem>
            <MenuDivider />
            <MenuItem
              onClick={onDelete}
              isDisabled={!!cannotDeleteReason}
              title={cannotDeleteReason ? cannotDeleteReason : ""}
            >
              Delete file
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </HStack>
  );
};

export const DeleteFileModal: React.FC<{
  file: components["schemas"]["File"];
  onClose: () => void;
  onSubmit: () => Promise<void>;
}> = ({ file, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <Modal isOpen onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete file</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <Text>
              {"Are you sure you want to delete "}
              <Text as="span" fontWeight="semibold">
                {file.name}
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
