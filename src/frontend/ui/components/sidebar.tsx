import { Box, Stack, Text } from "@chakra-ui/react";
import React from "react";
import { Link, LinkProps, useMatch, useResolvedPath } from "react-router-dom";
import { BoxedArrowForward } from "./icon";

export type SidebarLinks = (
  | { text: string; to: string; icon?: "BoxedArrowForward" }
  | { heading: string }
  | { divider: true }
)[];

const SidebarLink: React.FC<LinkProps> = ({ children, to }) => {
  const resolved = useResolvedPath(to);
  const isActive = useMatch({ path: `${resolved.pathname}/*`, end: true });

  const styles = isActive
    ? {
        color: "gray.50",
        bg: "gray.900",
        borderColor: "purple.400",
      }
    : {
        color: "gray.200",
        bg: "gray.800",
        borderColor: "gray.800",
        _hover: {
          bg: "gray.900",
          borderColor: "gray.900",
        },
      };

  return (
    <Box
      as={Link}
      to={to}
      display="flex"
      alignItems="center"
      py={2}
      px={3}
      borderLeftWidth={4}
      {...styles}
    >
      {children}
    </Box>
  );
};

const SidebarHeading: React.FC = ({ children }) => {
  return (
    <Text
      px={4}
      pt={4}
      textTransform="uppercase"
      fontWeight="semibold"
      color="gray.400"
      fontSize="xs"
      userSelect="none"
    >
      {children}
    </Text>
  );
};

const SidebarDivider: React.FC = () => {
  return (
    <Box px={4} py={4}>
      <Box width="30px" height="4px" bg="gray.600" borderRadius="4px" />
    </Box>
  );
};

export const Sidebar: React.FC<{ links: SidebarLinks }> = ({ links }) => {
  return (
    <Stack minWidth="160px" spacing={1} py={2} bg="gray.800">
      {links.map((link, index) => {
        if ("divider" in link) {
          return <SidebarDivider key={index} />;
        }

        if ("heading" in link) {
          return <SidebarHeading key={index}>{link.heading}</SidebarHeading>;
        }

        const { to, text, icon: Icon } = link;

        return (
          <SidebarLink key={index} to={to}>
            {text}
            {Icon === "BoxedArrowForward" && (
              <BoxedArrowForward color="gray.500" height={2} ml={1} mt="3px" />
            )}
          </SidebarLink>
        );
      })}
    </Stack>
  );
};
