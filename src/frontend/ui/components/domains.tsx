import {
  DeleteIcon,
  EditIcon,
  ArrowForwardIcon,
  LockIcon,
} from "@chakra-ui/icons";
import { HStack, Button, Text } from "@chakra-ui/react";
import React from "react";
import { Link } from "react-router-dom";
import { components } from "../../../backend/api/generated/apiSchema";
import { Card } from "./card";
import { Status } from "./status";

export const DomainCard: React.FC<{
  domain: components["schemas"]["Domain"];
  masterDomain: components["schemas"]["MasterDomain"];
  app?: components["schemas"]["App"];
  appChart?: components["schemas"]["AppChart"];
  target?: {
    name: string;
    url: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ domain, masterDomain, target, onEdit, onDelete }) => {
  return (
    <HStack>
      <Card body>
        <HStack spacing={4} justify="space-between">
          <Text fontWeight="medium">{domain.hostname}</Text>
          {target && (
            <HStack spacing={0} color="gray.500">
              <ArrowForwardIcon height={4} color="gray.500" mr={4} />
              <Button
                as={Link}
                variant="link"
                fontWeight="inherit"
                to={target.url}
                minWidth={0}
              >
                {target.name}
              </Button>
              <Text>:</Text>
              <Text>{domain.targetPort}</Text>
            </HStack>
          )}

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
            {onEdit && (
              <Button
                variant="outline"
                leftIcon={<EditIcon />}
                size="xs"
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                colorScheme="red"
                size="xs"
                onClick={onDelete}
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
