import {
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  HStack,
  Input,
  Select,
  Stack,
} from "@chakra-ui/react";
import { Formik, Form } from "formik";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SubmitButton } from "../components/button";
import { CodeMirror, CodeMirrorMode } from "../components/codemirror";
import { validateOpenApiPath } from "../utils/validation";

const validator = validateOpenApiPath("/v1/projects/{projectId}/files");

const modeByExtension: { [extension: string]: CodeMirrorMode } = {
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  json: "application/json",
  html: "text/html",
  txt: "text",
};

const defaultMode: CodeMirrorMode = "text";

const modeOptions: { text: string; mode: CodeMirrorMode }[] = [
  { text: "text", mode: "text" },
  { text: "xml", mode: "xml" },
  { text: "yaml", mode: "yaml" },
  { text: "json", mode: "application/json" },
  { text: "html", mode: "text/html" },
];

const guessMode = (name: string): CodeMirrorMode => {
  const extension = name.split(".").reverse()[0].toLowerCase();
  const modeGuess = modeByExtension[extension];
  return modeGuess || defaultMode;
};

const CreateFileForm: React.FC<{
  cancelUrl?: string;
  initialValues?: {
    name: string;
    isSecret: boolean;
    content: string;
  };
  onSubmit: (values: {
    name: string;
    isSecret: boolean;
    content: string;
  }) => Promise<void>;
}> = ({ initialValues, cancelUrl, onSubmit }) => {
  const [mode, setMode] = useState<CodeMirrorMode>(
    initialValues ? guessMode(initialValues.name) : defaultMode
  );

  return (
    <Formik
      initialValues={{
        name: initialValues ? initialValues.name : "",
        isSecret: initialValues ? initialValues.isSecret : false,
        content: initialValues ? initialValues.content : "",
      }}
      validate={validator}
      onSubmit={async (data, { setStatus }) => {
        setStatus(null);
        try {
          await onSubmit(data);
        } catch (error) {
          console.error(error);
          setStatus("An unknown error occurred");
        }
      }}
    >
      {({
        values,
        isSubmitting,
        setFieldValue,
        setFieldTouched,
        touched,
        errors,
        status,
      }) => {
        const allErrors = [
          ...(touched.name && errors.name ? [`Name ${errors.name}`] : []),
          ...(status ? [status] : []),
        ];

        return (
          <Form>
            <Stack spacing={2} align="stretch" justify="stretch">
              <HStack spacing={4} justify="space-between">
                <FormControl
                  id="name"
                  isInvalid={touched.name && !!errors.name}
                  isDisabled={isSubmitting}
                >
                  <Input
                    id="name"
                    autoFocus
                    size="sm"
                    placeholder="e.g. config.yaml"
                    value={values.name}
                    onKeyDown={() => setFieldTouched("name")}
                    onChange={(event) => {
                      const name = event.target.value.replace(/[\s]/g, "");
                      setFieldValue("name", name);

                      const modeGuess = guessMode(name);
                      if (modeGuess && modeGuess !== mode) {
                        setMode(modeGuess);
                      }
                    }}
                    isDisabled={isSubmitting}
                  />
                </FormControl>
                <HStack spacing={2}>
                  {cancelUrl && (
                    <Button
                      as={Link}
                      variant="outline"
                      size="sm"
                      to={cancelUrl}
                    >
                      Cancel
                    </Button>
                  )}
                  <SubmitButton isLoading={isSubmitting}>Save</SubmitButton>
                </HStack>
              </HStack>
              {allErrors.length > 0 && (
                <Stack spacing={2}>
                  {allErrors.map((error, index) => (
                    <FormControl key={index} isInvalid>
                      <FormErrorMessage>{error}</FormErrorMessage>
                    </FormControl>
                  ))}
                </Stack>
              )}
              <Divider borderColor="gray.200" />
              <HStack spacing={2} justify="end">
                <Select
                  size="xs"
                  maxWidth="100px"
                  value={mode}
                  onChange={(event) => {
                    const modeOption = modeOptions.find(
                      (modeOption) => modeOption.mode === event.target.value
                    );
                    setMode(modeOption.mode);
                  }}
                >
                  {modeOptions.map((modeOption, index) => (
                    <option key={index} value={modeOption.mode}>
                      {modeOption.text}
                    </option>
                  ))}
                </Select>
              </HStack>
              <Box minH="300px">
                <CodeMirror
                  value={values.content}
                  options={{
                    mode,
                    theme: "shipmight",
                    lineNumbers: true,
                    placeholder: "File content goes here…",
                  }}
                  onBeforeChange={(editor, data, value) => {
                    setFieldValue("content", value);
                  }}
                />
              </Box>
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
};

export default CreateFileForm;
