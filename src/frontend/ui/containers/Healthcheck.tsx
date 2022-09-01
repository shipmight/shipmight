import React, { useEffect, useState } from "react";
import { get } from "../apiFetch";
import { CouldNotConnectToApiView } from "../components/error";
import { LoadingView } from "../components/loading";
import { Page } from "../components/page";

const HealthCheck: React.FC = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUnhealthy, setIsUnhealthy] = useState(false);

  useEffect(() => {
    get("/v1/readyz", {}, {}, 200)
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsUnhealthy(true);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <Page>
        <LoadingView minHeight="100%" />
      </Page>
    );
  }

  if (isUnhealthy) {
    return (
      <Page>
        <CouldNotConnectToApiView />
      </Page>
    );
  }

  return <>{children}</>;
};

export default HealthCheck;
