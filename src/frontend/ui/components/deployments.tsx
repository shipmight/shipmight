import { Stack, HStack, Text } from "@chakra-ui/react";
import React from "react";
import { format, parseISO } from "date-fns";
import { components } from "../../../backend/api/generated/apiSchema";
import { Status } from "./status";

type Deployment = components["schemas"]["Deployment"];

export const DeploymentStatus: React.FC<
  Pick<Deployment, "replicas" | "readyReplicas">
> = ({ replicas, readyReplicas }) => {
  if (replicas === 0 && readyReplicas === 0) {
    return null;
  }

  const title = `${readyReplicas} of ${replicas} pods are running`;

  if (readyReplicas < replicas) {
    return (
      <Status variant="muted" loading title={title}>
        {`${readyReplicas}/${replicas}`}
      </Status>
    );
  }

  return (
    <Status variant="success" orb title={title}>
      {`${readyReplicas}/${replicas}`}
    </Status>
  );
};

export const DeploymentListItem: React.FC<{
  deployment: Deployment;
}> = ({ deployment }) => {
  const createdAt = parseISO(deployment.createdAt);

  return (
    <Stack spacing={1} fontSize="sm">
      <HStack spacing={2}>
        <Text
          color="gray.600"
          title={`${format(
            createdAt,
            "yyyy-MM-dd kk:mm:ss.SSS (OOOO)"
          )} - ID: ${deployment.releaseId}`}
        >
          {format(createdAt, "yyyy-MM-dd kk:mm:ss")}
        </Text>
        <DeploymentStatus {...deployment} />
      </HStack>
      {deployment.podStatuses.length > 0 && (
        <Stack spacing={0} py={1} px={2} bg="gray.200" borderRadius="3px">
          {deployment.podStatuses.map((podStatus, podStatusIndex) => {
            return (
              <HStack key={podStatusIndex} spacing={2}>
                <Text color="gray.700" isTruncated>
                  Replica {podStatusIndex + 1}
                </Text>
                {podStatus.status === "PENDING" && (
                  <Status variant="muted" loading>
                    {podStatus.message || "Running"}
                  </Status>
                )}
                {podStatus.status === "RUNNING" && (
                  <Status variant="success">
                    {podStatus.message || "Running"}
                  </Status>
                )}
                {podStatus.status === "ERRORED" && (
                  <Status variant="error">
                    {podStatus.message || "Errored"}
                  </Status>
                )}
              </HStack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
