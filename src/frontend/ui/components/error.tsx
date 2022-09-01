import {
  Stack,
  Button,
  Text,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
} from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import React, { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Page } from "./page";
import { Logo } from "./logo";

export const NotFoundView: React.FC<{
  message?: ReactNode;
  backUrl?: string;
  backText?: string;
}> = ({ message, backUrl, backText }) => {
  return (
    <Stack py={4} spacing={4} align="center">
      <Text color="gray.700" fontWeight="semibold">
        404
      </Text>
      {message && <Text color="gray.700">{message}</Text>}
      {backUrl && backText && (
        <Stack>
          <Button as={Link} to={backUrl} variant="outline" size="sm">
            {backText}
          </Button>
        </Stack>
      )}
    </Stack>
  );
};

export const CouldNotConnectToApiView: React.FC = () => {
  return (
    <Stack py={4} spacing={4} align="center">
      <Logo color="purple.500" height={24} />
      <Text color="gray.700" fontWeight="semibold">
        Could not connect to Shipmight API
      </Text>
    </Stack>
  );
};

export const ErrorView: React.FC<{
  retry?: () => void;
  errors?: unknown[];
}> = ({ retry, errors }) => {
  const [showError, setShowError] = useState(false);

  return (
    <Alert
      status="error"
      variant="subtle"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      minHeight="200px"
      padding={4}
    >
      <AlertIcon boxSize="40px" mr={0} />
      <AlertTitle mt={4} mb={1} fontSize="lg">
        Uh oh
      </AlertTitle>
      <AlertDescription maxWidth="sm">
        An unexpected error happened while loading this view.
      </AlertDescription>
      {retry && (
        <Button
          marginTop={2}
          colorScheme="red"
          size="sm"
          variant="outline"
          onClick={() => retry()}
        >
          Retry operation
        </Button>
      )}
      {errors && (
        <Stack spacing={2} marginTop={2} align="center">
          <Button
            size="xs"
            colorScheme="red"
            variant="ghost"
            rightIcon={showError ? <ChevronUpIcon /> : <ChevronDownIcon />}
            onClick={() => setShowError(!showError)}
          >
            {showError ? "Hide detailed error" : "Show detailed error"}
          </Button>
          {showError && (
            <Box
              fontFamily="mono"
              background="red.200"
              color="red.800"
              fontSize="10px"
              maxHeight="100px"
              overflowY="scroll"
              padding={2}
              textAlign="left"
              whiteSpace="pre-wrap"
            >
              {errors
                .map((error) =>
                  error instanceof Error ? error.stack : error.toString()
                )
                .join("\n\n")}
            </Box>
          )}
        </Stack>
      )}
    </Alert>
  );
};

type ErrorBoundaryComponentProps = {
  wrapInPage?: boolean;
  locationKey?: string;
};

// Do not use this component directly. It is only exported for ui.tsx which uses it outside a router.
// Use `ErrorBoundary` below.
export class ErrorBoundaryComponent extends React.Component<
  ErrorBoundaryComponentProps,
  {
    error: unknown | null;
  }
> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  reset() {
    this.setState({
      error: null,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryComponentProps) {
    const { locationKey } = this.props;

    if (prevProps.locationKey !== locationKey) {
      this.reset();
    }
  }

  render(): ReactNode {
    if (this.state.error && this.props.wrapInPage) {
      return (
        <Page>
          <ErrorView errors={[this.state.error]} />
        </Page>
      );
    }

    if (this.state.error) {
      return <ErrorView errors={[this.state.error]} />;
    }

    return this.props.children || null;
  }
}

// Location-aware ErrorBoundary. Passes locationKey to ErrorBoundaryComponent, which can reset itself upon location change.
// > Why not just use <ErrorBoundaryComponent key={location.key}>?
// Because it forces a rerender of the child components on every location change. This method only rerenders if there is an active error-state.
export const ErrorBoundary: React.FC<ErrorBoundaryComponentProps> = ({
  children,
  ...props
}) => {
  const location = useLocation();
  return (
    <ErrorBoundaryComponent {...props} locationKey={location.key}>
      {children}
    </ErrorBoundaryComponent>
  );
};
