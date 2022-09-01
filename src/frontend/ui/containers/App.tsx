import {
  Container,
  HStack,
  Modal,
  ModalHeader,
  ModalBody,
  ModalContent,
  ModalOverlay,
  SlideFade,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { ErrorWithResponse, onUnauthorized, post } from "../apiFetch";
import { LoadingView } from "../components/loading";
import { Logo } from "../components/logo";
import { Page } from "../components/page";
import GlobalStateWrapper from "./GlobalStateWrapper";
import LoginForm from "./LoginForm";
import PasswordChangeForm from "./PasswordChangeForm";
import Router from "./Router";

//
// This component is mainly a wrapper for authentication state
//

// Simple implementation in-place of `decode` from `jsonwebtoken` which can't
// be bundled for browser with esbuild. JWT signature verification is left
// undone on purpose; the server will always verify it. In the client we just
// want to know if the token is expired or not, so we can attempt to refresh
// it periodically.
const decodeJwt = (jwt: string): { exp: number; iat: number } => {
  try {
    const payloadBase64 = jwt.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    if (
      typeof payload !== "object" ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      throw new Error("payload missing expected properties");
    }
    return payload;
  } catch (error) {
    throw new Error(`could not decode JWT payload, error: ${error.stack}`);
  }
};

const secondsUntilJwtExpiry = (bearerToken: string): number => {
  const payload = decodeJwt(bearerToken);
  const difference = payload.exp - Math.floor(Date.now() / 1000);
  return difference;
};

interface AuthState {
  showLoadingIndicator: boolean;
  showLoginPage: boolean;
  showLoginModal: false | { onLogin: () => void };
  showPasswordChangeModal: boolean;
  jwt: string | undefined;
}

const App: React.FC = () => {
  const [
    {
      showLoadingIndicator,
      showLoginPage,
      showLoginModal,
      showPasswordChangeModal,
      jwt,
    },
    setState,
  ] = useState<AuthState>({
    showLoadingIndicator: true,
    showLoginPage: false,
    showLoginModal: false,
    showPasswordChangeModal: false,
    jwt: undefined,
  });

  // On page load, check if we have a token stored in (httpOnly) cookie.
  // If so, store it (for reading expiry time) and go on.
  // If not, show login page.
  useEffect(() => {
    post("/v1/tokens/refresh", {}, { cookie: "write" }, {}, 201)
      .then(({ jwt }) => {
        setState((prevState) => ({
          ...prevState,
          jwt,
          showLoadingIndicator: false,
        }));
      })
      .catch((error) => {
        if (
          error instanceof ErrorWithResponse &&
          error.response.status === 401
        ) {
          setState((prevState) => ({
            ...prevState,
            showLoginPage: true,
            showLoadingIndicator: false,
          }));
          return;
        }
        throw error;
      });
  }, []);

  // Whenever JWT changes (i.e. after POST login or POST refresh),
  // set a timer to refresh it before it expires
  useEffect(() => {
    if (jwt) {
      const seconds = secondsUntilJwtExpiry(jwt) - 30;
      if (seconds < 1) {
        // Weirdly sudden expiry time. Not a normal situation. Could happen in dev
        // environment if dev changes `tokenLifetimeSeconds` for testing purposes.
        return;
      }
      const timeout = setTimeout(async () => {
        try {
          const { jwt } = await post(
            "/v1/tokens/refresh",
            {},
            { cookie: "write" },
            {},
            201
          );
          setState((prevState) => ({
            ...prevState,
            jwt,
          }));
        } catch (error) {
          console.error(error);
        }
      }, seconds * 1000);
      return function cleanup() {
        clearTimeout(timeout);
      };
    }
  }, [jwt]);

  // Callback which is called by apiFetch if a request returns Unauthorized.
  // Returns a pending promise, which is fulfilled after user has logged back
  // in or changed their password when requested.
  // Whenever a successful token creation happened, this should be set to the
  // `onUnauthorized` memo object in apiFetch, so apiFetch can trigger the
  // login-modal.
  useEffect(() => {
    if (!showLoadingIndicator && !showLoginPage && !showPasswordChangeModal) {
      onUnauthorized.callback = async (
        code: "UNAUTHORIZED" | "PASSWORD_CHANGE_REQUIRED"
      ) => {
        if (code === "PASSWORD_CHANGE_REQUIRED") {
          return new Promise<void>(() => {
            setState((prevState) => ({
              ...prevState,
              showPasswordChangeModal: true,
            }));
          });
        }
        return new Promise<void>((resolve) => {
          setState((prevState) => ({
            ...prevState,
            showLoginModal: { onLogin: () => resolve() },
          }));
        });
      };
    }
  }, [showLoadingIndicator, showLoginPage, showPasswordChangeModal]);

  const postLogin: (data: {
    username: string;
    password: string;
  }) => Promise<"INVALID_CREDENTIALS" | undefined> = async (data) => {
    try {
      const { jwt } = await post(
        "/v1/tokens",
        {},
        { cookie: "write" },
        { username: data.username, password: data.password },
        201
      );
      setState((prevState) => ({
        ...prevState,
        jwt,
        showLoginPage: false,
      }));
    } catch (error) {
      if (error instanceof ErrorWithResponse && error.response.status === 401) {
        return "INVALID_CREDENTIALS";
      }
      throw error;
    }
  };

  const logout = async () => {
    await post("/v1/tokens/clear", {}, { cookie: "write" }, {}, 200);
  };

  if (showLoadingIndicator) {
    return (
      <Page>
        <LoadingView minHeight="100%" />
      </Page>
    );
  }

  if (showLoginPage) {
    return (
      <Page>
        <Container width="container.xs" my={12}>
          <SlideFade
            in
            offsetY="40px"
            transition={{ enter: { duration: 0.5 } }}
          >
            <HStack mb={4}>
              <Logo color="purple.500" height={24} />
            </HStack>
            <LoginForm
              onSubmit={async (data) => {
                const result = await postLogin(data);
                return result;
              }}
            />
          </SlideFade>
        </Container>
      </Page>
    );
  }

  if (showPasswordChangeModal) {
    return (
      <Page>
        <Container width="container.xs" my={12}>
          <HStack mb={4}>
            <Logo color="purple.500" height={24} />
          </HStack>
          <PasswordChangeForm
            onSubmit={async (data) => {
              await post(
                "/v1/me/password",
                {},
                { cookie: "write" },
                { password: data.password },
                204
              );
              window.location.reload();
            }}
          />
        </Container>
      </Page>
    );
  }

  return (
    <>
      <GlobalStateWrapper>
        <Router logout={logout} />
      </GlobalStateWrapper>
      <Modal
        size="xs"
        isOpen={!!showLoginModal}
        onClose={() => {
          // not used
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader pb={0}>Your session has expired</ModalHeader>
          <ModalBody>Please log in again.</ModalBody>
          <ModalBody pb={8}>
            <LoginForm
              onSubmit={async (data) => {
                if (showLoginModal === false) {
                  throw new Error("expected onLogin callback in state");
                }
                const { onLogin } = showLoginModal;
                const result = await postLogin(data);
                if (result === undefined) {
                  onLogin();
                  setState((prevState) => ({
                    ...prevState,
                    showLoginModal: false,
                  }));
                }
                return result;
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default App;
