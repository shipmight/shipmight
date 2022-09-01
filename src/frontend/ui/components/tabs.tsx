import { HStack, Box } from "@chakra-ui/react";
import React from "react";
import { Link, useMatch, useResolvedPath } from "react-router-dom";

export const Tabs: React.FC = ({ children }) => {
  return (
    <HStack borderBottomWidth="2px" borderColor="gray.300">
      {children}
    </HStack>
  );
};

export const TabLink: React.FC<{ to: string }> = ({ to, children }) => {
  const resolved = useResolvedPath(to);
  const isActive = useMatch({ path: `${resolved.pathname}/*`, end: true });

  const activeStyles = isActive
    ? {
        bg: "gray.200",
        color: "gray.900",
        boxShadow: "0 2px 0 0 #A78BFA", // purple.400
      }
    : {};

  return (
    <Box
      as={Link}
      to={to}
      // fontSize="sm"
      py={1}
      px={2}
      color="gray.600"
      {...activeStyles}
    >
      {children}
    </Box>
  );
};
