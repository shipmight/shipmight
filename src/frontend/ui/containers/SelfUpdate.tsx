import { HStack, Button, Text, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { get, post } from "../apiFetch";
import useSimplePolling, {
  SimplePollingState,
} from "../utils/useSimplePolling";

const UpdateButton: React.FC<{ onClick: () => Promise<void> }> = ({
  onClick,
  children,
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      colorScheme="purple"
      variant="solid"
      isLoading={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          await onClick();
        } catch (error) {
          console.error(error);
          toast({
            title: "Scheduling update failed",
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "bottom-right",
          });
        }
        setIsLoading(false);
      }}
    >
      {children}
    </Button>
  );
};

const SelfUpdate: React.FC<{
  upgradeLock: SimplePollingState<Record<string, unknown> | null>;
}> = ({ upgradeLock }) => {
  const { load, data, isLoading, hasErrored, InlineStatus } = useSimplePolling(
    {
      fetchData: async () => {
        const status = await get("/v1/self-update", {}, {}, 200);
        return status;
      },
    },
    []
  );

  useEffect(() => {
    load();
  }, []);

  if (isLoading || upgradeLock.isLoading) {
    return (
      <HStack spacing={2}>
        <Button colorScheme="gray" variant="outline" isLoading>
          Update
        </Button>
      </HStack>
    );
  }

  if (hasErrored) {
    return <InlineStatus>available updates</InlineStatus>;
  }

  if (upgradeLock.hasErrored) {
    return (
      <upgradeLock.InlineStatus>available updates</upgradeLock.InlineStatus>
    );
  }

  if (!data.isEnabled) {
    return <Text>Auto-update is not enabled.</Text>;
  }

  if (!data.availableUpdateVersion) {
    return (
      <HStack spacing={2}>
        <Button colorScheme="gray" variant="outline" isDisabled>
          Update
        </Button>
        <Text>Shipmight is up-to-date</Text>
      </HStack>
    );
  }

  if (upgradeLock.data !== null) {
    return (
      <HStack spacing={2}>
        <Button colorScheme="gray" variant="outline" isLoading>
          Update
        </Button>
        <Text>Update is in progress</Text>
      </HStack>
    );
  }

  return (
    <HStack spacing={2}>
      <UpdateButton
        onClick={async () => {
          await post(
            "/v1/self-update",
            {},
            {},
            { version: data.availableUpdateVersion },
            200
          );
          upgradeLock.load();
        }}
      >
        Update to {data.availableUpdateVersion}
      </UpdateButton>
      <Text>Shipmight can be updated to a newer version</Text>
    </HStack>
  );
};

export default SelfUpdate;
