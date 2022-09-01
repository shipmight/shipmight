import { Code } from "@chakra-ui/react";
import React from "react";
import { useLocation } from "react-router";
import { NotFoundView } from "../components/error";
import { Page } from "../components/page";

const NotFoundPage: React.FC<{ showBackToHome?: boolean }> = ({
  showBackToHome,
}) => {
  const location = useLocation();
  return (
    <Page>
      <NotFoundView
        message={
          <>
            Page <Code>{location.pathname}</Code> was not found.
          </>
        }
        backUrl={showBackToHome ? "/" : undefined}
        backText={showBackToHome ? "Go to homepage" : undefined}
      />
    </Page>
  );
};

export default NotFoundPage;
