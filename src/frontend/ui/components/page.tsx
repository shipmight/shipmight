import React from "react";
import { Flex, Box } from "@chakra-ui/react";
import { Sidebar, SidebarLinks } from "./sidebar";

export const Page: React.FC<{ sidebarLinks?: SidebarLinks }> = ({
  sidebarLinks,
  children,
}) => {
  return (
    <Flex
      bg="gray.100"
      color="gray.900"
      minHeight="100%"
      fontSize="md"
      justify={sidebarLinks ? "" : "center"}
    >
      {sidebarLinks && <Sidebar links={sidebarLinks} />}
      <Box p={4} pb={16} flex={1} maxW="640px">
        {children}
      </Box>
    </Flex>
  );
};
