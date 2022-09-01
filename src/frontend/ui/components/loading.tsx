import React from "react";
import {
  Button,
  Center,
  CircularProgress,
  HStack,
  Text,
} from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";

export const LoadingSpinner: React.FC<
  { dark?: boolean } & Parameters<typeof CircularProgress>[0]
> = ({ dark, ...props }) => {
  return (
    <CircularProgress
      size={6}
      color={dark ? "gray.700" : "gray.500"}
      trackColor={dark ? "gray.400" : "gray.200"}
      {...props}
    />
  );
};

export const LoadingView: React.FC<{
  minHeight?: Parameters<typeof Center>[0]["minHeight"];
}> = ({ minHeight }) => {
  return (
    <Center minHeight={minHeight || "200px"}>
      <CircularProgress size={6} color="gray.500" isIndeterminate />
    </Center>
  );
};

export const BlankSlate: React.FC = ({ children }) => {
  return (
    <Center
      minHeight="60px"
      borderRadius={4}
      borderColor="gray.200"
      borderWidth={1}
      fontSize="sm"
      color="gray.600"
    >
      {children}
    </Center>
  );
};

export const InlinePollingStatus: React.FC<{
  hasErrored: boolean;
  retry: () => void;
  hasErrors: boolean;
  hasBeenLoadingForAWhile: boolean;
}> = ({ hasErrored, retry, hasErrors, hasBeenLoadingForAWhile, children }) => {
  if (hasErrored) {
    return (
      <HStack spacing={1}>
        <WarningIcon height={4} color="red.700" />
        <Text color="red.600" fontSize="sm">
          Loading {children} failed…
        </Text>
        <Button
          size="xs"
          variant="outline"
          colorScheme="red"
          onClick={() => retry()}
          marginLeft={2}
        >
          Retry
        </Button>
      </HStack>
    );
  }

  if (hasErrors) {
    return (
      <HStack spacing={1}>
        <CircularProgress size={4} color="yellow.700" isIndeterminate />
        <Text color="yellow.600" fontSize="sm">
          Having trouble loading {children}…
        </Text>
      </HStack>
    );
  }

  if (hasBeenLoadingForAWhile) {
    return (
      <HStack spacing={1}>
        <CircularProgress size={4} color="gray.700" isIndeterminate />
      </HStack>
    );
  }

  return null;
};
