import React from "react";
import { render } from "react-dom";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import App from "./containers/App";
import chakraTheme from "./chakraTheme";
import { Helmet } from "react-helmet";
import { ErrorBoundaryComponent } from "./components/error";
import HealthCheck from "./containers/Healthcheck";

//
// This is the frontend JS bundle endpoint. It should load all loaders etc. React boilerplate.
//
// Actual app logic begins in: containers/App.tsx
//

const Ui: React.FC = () => {
  return (
    <ChakraProvider theme={chakraTheme}>
      <ErrorBoundaryComponent wrapInPage>
        <BrowserRouter basename={window.shipmightGlobals.baseUri}>
          <Helmet>
            <title>Shipmight</title>
          </Helmet>
          <HealthCheck>
            <App />
          </HealthCheck>
        </BrowserRouter>
      </ErrorBoundaryComponent>
    </ChakraProvider>
  );
};

render(<Ui />, document.querySelector(".app"));
