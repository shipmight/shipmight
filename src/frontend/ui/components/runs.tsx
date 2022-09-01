import { HStack, IconButton, Text } from "@chakra-ui/react";
import React from "react";
import { format, parseISO } from "date-fns";
import { components } from "../../../backend/api/generated/apiSchema";
import { Status } from "./status";
import { DeleteIcon } from "@chakra-ui/icons";

type Run = components["schemas"]["Run"];

export const RunListItem: React.FC<{
  run: Run;
  onDelete?: () => void;
}> = ({ run, onDelete }) => {
  const createdAt = parseISO(run.createdAt);

  return (
    <HStack spacing={2} fontSize="sm" justify="space-between">
      <HStack spacing={2} fontSize="sm">
        <Text
          color="gray.600"
          title={`${format(
            createdAt,
            "yyyy-MM-dd kk:mm:ss.SSS (OOOO)"
          )} - ID: ${run.releaseId}`}
        >
          {format(createdAt, "yyyy-MM-dd kk:mm:ss")}
        </Text>
        {run.jobStatus.status === "RUNNING" && (
          <Status variant="muted" loading>
            {run.jobStatus.message || "Running"}
          </Status>
        )}
        {run.jobStatus.status === "SUCCEEDED" && (
          <Status variant="success">
            {run.jobStatus.message || "Succeeded"}
          </Status>
        )}
        {run.jobStatus.status === "FAILED" && (
          <Status variant="error">{run.jobStatus.message || "Failed"}</Status>
        )}
      </HStack>
      {onDelete && (
        <IconButton
          variant="ghost"
          colorScheme="gray"
          size="xs"
          onClick={onDelete}
          aria-label="Delete run"
          icon={<DeleteIcon color="gray.400" />}
          w={5}
          minW={5}
          h={5}
        />
      )}
    </HStack>
  );
};
