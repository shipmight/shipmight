import {
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  FormErrorMessage,
} from "@chakra-ui/react";
import { Form, Formik } from "formik";
import React from "react";
import { validateOpenApiPath } from "../utils/validation";

const validator = validateOpenApiPath("/v1/tokens");

const LoginForm: React.FC<{
  onSubmit: (values: {
    username: string;
    password: string;
  }) => Promise<"INVALID_CREDENTIALS" | undefined>;
}> = ({ onSubmit }) => {
  return (
    <Formik
      initialValues={{
        username: "",
        password: "",
      }}
      validate={validator}
      onSubmit={async (data, { setStatus }) => {
        setStatus(null);
        try {
          const status = await onSubmit(data);
          if (status === "INVALID_CREDENTIALS") {
            setStatus("Invalid credentials");
            return;
          }
        } catch (error) {
          console.error(error);
          setStatus("An unknown error occurred");
        }
      }}
    >
      {({
        values,
        handleChange,
        handleBlur,
        isSubmitting,
        touched,
        errors,
        status,
      }) => (
        <Form>
          <Stack spacing={4}>
            <FormControl
              id="username"
              isInvalid={touched.username && !!errors.username}
            >
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                placeholder="Username"
                autoFocus
                isDisabled={isSubmitting}
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.username}
              />
              <FormErrorMessage>Username {errors.username}</FormErrorMessage>
            </FormControl>
            <FormControl
              id="password"
              isInvalid={touched.password && !!errors.password}
            >
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                placeholder="Password"
                isDisabled={isSubmitting}
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
              <FormErrorMessage>Password {errors.password}</FormErrorMessage>
            </FormControl>
            <Button
              type="submit"
              colorScheme="green"
              isLoading={isSubmitting}
              size="md"
            >
              Log in
            </Button>
            {status && (
              <FormControl isInvalid>
                <FormErrorMessage>{status}</FormErrorMessage>
              </FormControl>
            )}
          </Stack>
        </Form>
      )}
    </Formik>
  );
};

export default LoginForm;
