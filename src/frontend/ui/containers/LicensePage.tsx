import { Text, HStack, Stack } from "@chakra-ui/react";
import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { BackButton } from "../components/button";
import { ErrorBoundary } from "../components/error";
import { Page } from "../components/page";

const LicensePage: React.FC = () => {
  return (
    <Page>
      <Helmet>
        <title>License - Shipmight</title>
      </Helmet>
      <Stack spacing={8}>
        <HStack>
          <BackButton as={Link} to="/">
            Back
          </BackButton>
        </HStack>
        <ErrorBoundary>
          <Text whiteSpace="pre-wrap">{process.env.LICENSE_TEXT}</Text>
        </ErrorBoundary>
      </Stack>
    </Page>
  );
};

export default LicensePage;
