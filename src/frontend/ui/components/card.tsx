import { Stack, Box, Divider } from "@chakra-ui/react";
import React from "react";

export const CardBody: React.FC = ({ children }) => {
  return (
    <Box px={5} pt={2} pb={3} spacing={2}>
      {children}
    </Box>
  );
};

export const Card: React.FC<{ body?: boolean }> = ({
  body,
  children,
  ...props
}) => {
  const stackProps = {
    width: "100%",
    borderRadius: 6,
    py: 2,
    bg: "white",
    divider: <Divider borderColor="gray.200" />,
    ...props,
  };

  if (body) {
    return (
      <Stack {...stackProps}>
        <CardBody>{children}</CardBody>
      </Stack>
    );
  }

  return <Stack {...stackProps}>{children}</Stack>;
};
