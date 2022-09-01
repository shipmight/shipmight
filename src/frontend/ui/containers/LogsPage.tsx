import { ChevronLeftIcon } from "@chakra-ui/icons";
import {
  Flex,
  Text,
  Box,
  Stack,
  ButtonGroup,
  Button,
  DarkMode,
  FormControl,
  FormLabel,
  Input,
  Divider,
  Checkbox,
  HStack,
  Center,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
} from "@chakra-ui/react";
import { format, isMatch, min, parse, sub } from "date-fns";
import debounce from "lodash.debounce";
import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorWithResponse, get } from "../apiFetch";
import { LoadingSpinner } from "../components/loading";
import { defaultDatetimeFormat } from "../utils/dates";
import useSimplePolling from "../utils/useSimplePolling";
import { useServiceObj } from "./GlobalStateWrapper";

const toNs = (datetimeString: string, capAtToday?: boolean): string => {
  let date = parse(datetimeString, defaultDatetimeFormat, new Date());
  if (capAtToday) {
    // If user set a date in the future, no sense to make such a query to the server
    date = min([date, new Date()]);
  }
  const ms = date.getTime();
  return `${ms}000000`;
};

// Using HEX codes because these are not really tied to the theme
// Avoiding red and yellow because they could be confused with error/warning status
const sourceColorPalette = [
  "#9F7AEA", // purple.400
  "#0BC5EA", // cyan.400
  "#4299E1", // blue.400
  "#38B2AC", // teal.400
  "#48BB78", // green.400
  "#ED64A6", // pink.400
];

const quickDateRanges: {
  text: string;
  getUrlState: () => { startTime: string; endTime: string };
}[] = [
  {
    text: "15m",
    getUrlState: () => {
      const now = Date.now();
      return {
        startTime: format(sub(now, { minutes: 15 }), defaultDatetimeFormat),
        endTime: format(now, defaultDatetimeFormat),
      };
    },
  },
  {
    text: "1h",
    getUrlState: () => {
      const now = Date.now();
      return {
        startTime: format(sub(now, { hours: 1 }), defaultDatetimeFormat),
        endTime: format(now, defaultDatetimeFormat),
      };
    },
  },
  {
    text: "24h",
    getUrlState: () => {
      const now = Date.now();
      return {
        startTime: format(sub(now, { hours: 24 }), defaultDatetimeFormat),
        endTime: format(now, defaultDatetimeFormat),
      };
    },
  },
  {
    text: "7d",
    getUrlState: () => {
      const now = Date.now();
      return {
        startTime: format(sub(now, { days: 7 }), defaultDatetimeFormat),
        endTime: format(now, defaultDatetimeFormat),
      };
    },
  },
  {
    text: "30d",
    getUrlState: () => {
      const now = Date.now();
      return {
        startTime: format(sub(now, { days: 30 }), defaultDatetimeFormat),
        endTime: format(now, defaultDatetimeFormat),
      };
    },
  },
];

const downloadFormats: {
  formatValue: string;
  name: string;
  extension: string;
}[] = [
  {
    formatValue: "csv-download",
    name: "CSV",
    extension: ".csv",
  },
  {
    formatValue: "ndjson-download",
    name: "Newline delimited JSON",
    extension: ".ndjson",
  },
];

const LogContent: React.FC<{
  urlState: LogsUrlState;
  sourceColor: Record<string, string>;
  stickToBottom: boolean;
  setStickToBottom: (value: boolean) => void;
  getLogs: Parameters<typeof LogPro9000>[0]["getLogs"];
}> = ({ urlState, sourceColor, stickToBottom, setStickToBottom, getLogs }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isErrored, setIsErrored] = useState<string>();
  const [data, setData] = useState<string[][]>([]);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement>();
  const scrollContainerRef = useCallback((node: HTMLDivElement) => {
    setScrollContainer(node);
  }, []);

  useEffect(() => {
    const errorHandler = async (error: unknown) => {
      console.error(error);
      let reqId = "unknown";
      if (error instanceof ErrorWithResponse) {
        const data = await error.response.json();
        if (data.requestId) {
          reqId = data.requestId;
        }
      }
      setIsErrored(reqId);
    };

    if (urlState.mode === "dateRange") {
      setIsLoading(true);
      setIsErrored(undefined);
      getLogs({
        sources: urlState.sources.join(","),
        startTime: toNs(urlState.endTime, true),
        endTime: toNs(urlState.startTime),
        limit: "1000",
      })
        .then((logs) => setData(logs))
        .catch(errorHandler)
        .then(() => {
          setIsLoading(false);
        });
    } else {
      const initialStartTime = toNs(
        format(sub(new Date(), { days: 7 }), defaultDatetimeFormat)
      );

      let hasBeenUnmounted = false;

      let refetchTimeout: NodeJS.Timeout;
      let startNs = BigInt(initialStartTime);

      const addDataAndRefetch = (logs: string[][]) => {
        if (hasBeenUnmounted) {
          return;
        }

        setData((prevLogs) => [...prevLogs, ...logs].slice(-1000));

        startNs = logs.length
          ? BigInt(logs[logs.length - 1][1]) + BigInt(1)
          : startNs;

        refetchTimeout = setTimeout(() => {
          setIsErrored(undefined);
          getLogs({
            sources: urlState.sources.join(","),
            startTime: startNs.toString(),
            endTime: toNs(format(new Date(), defaultDatetimeFormat)),
            limit: "100",
          })
            .then(addDataAndRefetch)
            .catch(errorHandler);
        }, 2000);
      };

      setIsLoading(true);
      setIsErrored(undefined);
      getLogs({
        sources: urlState.sources.join(","),
        startTime: toNs(format(new Date(), defaultDatetimeFormat)),
        endTime: initialStartTime,
        limit: "100",
      })
        .then(addDataAndRefetch)
        .catch(errorHandler)
        .then(() => {
          setIsLoading(false);
        });

      return function cleanup() {
        hasBeenUnmounted = true;
        clearTimeout(refetchTimeout);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollContainer) {
      if (urlState.mode === "dateRange") {
        scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
      } else {
        if (stickToBottom) {
          scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
        }

        const onScroll = debounce(
          () => {
            const { scrollHeight, clientHeight, scrollTop } = scrollContainer;
            const userScrolledToBottom =
              clientHeight + scrollTop === scrollHeight;
            setStickToBottom(userScrolledToBottom);
          },
          100,
          { leading: true }
        );
        scrollContainer.addEventListener("scroll", onScroll);
        return function cleanup() {
          scrollContainer.removeEventListener("scroll", onScroll);
        };
      }
    }
  }, [urlState.mode, data.length, scrollContainer, stickToBottom, isErrored]);

  if (isLoading) {
    return <LoadingSpinner dark isIndeterminate m={2} />;
  }

  if (urlState.mode === "dateRange" && isErrored) {
    return (
      <Center minHeight="60px" fontSize="sm" color="red.400">
        Fetching logs failed (requestId: {isErrored})
      </Center>
    );
  }

  if (data.length === 0) {
    return (
      <Center minHeight="60px" fontSize="sm" color="gray.400">
        {urlState.mode === "dateRange"
          ? "No logs to show for current selection"
          : "No recent logs"}
      </Center>
    );
  }

  return (
    <Box
      ref={scrollContainerRef}
      height="100%"
      overflowY="scroll"
      py={2}
      fontSize="xs"
      fontFamily="var(--font-family-monospace)"
    >
      {(data || []).map(([datetime, , sourceName, text], index) => (
        <Box
          key={index}
          px={2}
          py="2px"
          borderBottomColor="gray.800"
          borderBottomWidth="1px"
          _hover={{ bg: "gray.700" }}
          display="flex"
        >
          <Box as="span" title={datetime} minWidth="160px" color="gray.400">
            {datetime}
          </Box>
          <Text
            as="span"
            isTruncated
            title={sourceName}
            minWidth="100px"
            maxWidth="100px"
            pr={2}
            color={sourceColor[sourceName] || "gray.400"}
          >
            {sourceName}
          </Text>
          <Text wordBreak="break-all">{text}</Text>
        </Box>
      ))}
      {urlState.mode === "live" && isErrored && (
        <Text px={2} py="2px" color="red.400">
          Fetching logs failed (requestId: {isErrored})
        </Text>
      )}
    </Box>
  );
};

const SidebarSection: React.FC = ({ children }) => {
  return (
    <Stack spacing={2} p={2} pb={3}>
      {children}
    </Stack>
  );
};

const SidebarButton: React.FC<Parameters<typeof Button>[0]> = ({
  ...props
}) => {
  return <Button size="xs" colorScheme="blue" type="button" {...props} />;
};

const SidebarCheckbox: React.FC<Parameters<typeof Checkbox>[0]> = ({
  ...props
}) => {
  return <Checkbox size="sm" colorScheme="blue" {...props} />;
};

const SidebarRadio: React.FC<Parameters<typeof Radio>[0]> = ({ ...props }) => {
  return <Radio size="sm" colorScheme="blue" {...props} />;
};

const SidebarInput: React.FC<Parameters<typeof Input>[0]> = ({ ...props }) => {
  return (
    <Input
      size="xs"
      borderColor="gray.600"
      fontFamily="var(--font-family-monospace)"
      {...props}
    />
  );
};

const DatetimeInput: React.FC<
  Parameters<typeof Input>[0] & {
    onChange: (value: string) => void;
  }
> = ({ onChange, ...props }) => {
  const [value, setValue] = useState(props.value.toString());

  return (
    <SidebarInput
      {...props}
      placeholder="YYYY-MM-DD HH:mm:ss"
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onBlur={(event) => {
        setValue(event.target.value);
        if (isMatch(event.target.value.trim(), defaultDatetimeFormat)) {
          onChange(event.target.value.trim());
        }
      }}
      onKeyUp={(event) => {
        if (
          event.key === "Enter" &&
          isMatch(value.trim(), defaultDatetimeFormat)
        ) {
          onChange(value.trim());
        }
      }}
    />
  );
};

const ToolsModal: React.FC<{
  endpoint: string;
  urlState: LogsUrlState;
  sources: { id: string; name: string }[];
  onClose: () => void;
}> = ({ endpoint, urlState, sources, onClose }) => {
  const [startTime, setStartTime] = useState(
    urlState.mode === "live"
      ? format(new Date(), defaultDatetimeFormat)
      : urlState.startTime
  );
  const [endTime, setEndTime] = useState(
    urlState.mode === "live"
      ? format(new Date(), defaultDatetimeFormat)
      : urlState.endTime
  );
  const [selectedSources, setSelectedSources] = useState(urlState.sources);
  const [outputFormat, setOutputFormat] = useState(
    downloadFormats[0].formatValue
  );

  let downloadUrl = "";
  if (selectedSources.length) {
    const qs = new URLSearchParams({
      sources: selectedSources.join(","),
      startTime: toNs(startTime, true),
      endTime: toNs(endTime, true),
      limit: "10000",
      format: outputFormat,
    });
    downloadUrl = `${endpoint}?${qs.toString()}`;
  }

  return (
    <Modal isOpen={true} onClose={() => onClose()}>
      <ModalOverlay />
      <ModalContent color="gray.100">
        <ModalHeader>Download logs</ModalHeader>
        <ModalBody pb={8}>
          <Stack spacing={4}>
            <HStack spacing={2}>
              <FormControl width="160px">
                <FormLabel htmlFor="startTime">Start time</FormLabel>
                <DatetimeInput
                  id="startTime"
                  key={startTime}
                  value={startTime}
                  onChange={(value) => setStartTime(value)}
                />
              </FormControl>
              <FormControl width="160px">
                <FormLabel htmlFor="endTime">End time</FormLabel>
                <DatetimeInput
                  id="endTime"
                  key={endTime}
                  value={endTime}
                  onChange={(value) => setEndTime(value)}
                />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Last…</FormLabel>
              <HStack spacing={1} align="center">
                {quickDateRanges.map(({ text, getUrlState }, index) => (
                  <SidebarButton
                    key={index}
                    onClick={() => {
                      const { startTime, endTime } = getUrlState();
                      setStartTime(startTime);
                      setEndTime(endTime);
                    }}
                    variant="link"
                    size="xs"
                    color="gray.400"
                    title={`Select last ${text}`}
                  >
                    {text}
                  </SidebarButton>
                ))}
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel>Sources</FormLabel>
              <Stack spacing={1}>
                {sources.length === 0 ? (
                  <Text fontSize="sm" color="gray.400">
                    No sources
                  </Text>
                ) : (
                  sources.map(({ id, name }, index) => (
                    <SidebarCheckbox
                      key={index}
                      isTruncated
                      isChecked={selectedSources.includes(id)}
                      onChange={(event) => {
                        setSelectedSources(
                          event.target.checked
                            ? [...selectedSources, id]
                            : selectedSources.filter((item) => item !== id)
                        );
                      }}
                    >
                      <Text
                        title={name}
                        textOverflow="ellipsis"
                        color={
                          selectedSources.includes(id) ? "gray.50" : "gray.300"
                        }
                      >
                        {name}
                      </Text>
                    </SidebarCheckbox>
                  ))
                )}
              </Stack>
            </FormControl>
            <FormControl>
              <FormLabel>Format</FormLabel>
              <HStack spacing={2}>
                {downloadFormats.map(({ formatValue, name }) => (
                  <SidebarRadio
                    key={formatValue}
                    isChecked={formatValue === outputFormat}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setOutputFormat(formatValue);
                      }
                    }}
                  >
                    <Text
                      textOverflow="ellipsis"
                      color={
                        formatValue === outputFormat ? "gray.50" : "gray.300"
                      }
                    >
                      {name}
                    </Text>
                  </SidebarRadio>
                ))}
              </HStack>
            </FormControl>
            <HStack spacing={2}>
              <Button
                isDisabled={downloadUrl === ""}
                {...(downloadUrl
                  ? { as: "a", href: downloadUrl, target: "_blank" }
                  : {})}
              >
                {`Download ${
                  downloadFormats.find(
                    ({ formatValue }) => formatValue === outputFormat
                  ).extension
                } file`}
              </Button>
            </HStack>
            <Text fontSize="sm">
              Download is limited to 10,000 lines. Columns included: datetime,
              ns (nanoseconds), source, text.
            </Text>
          </Stack>
        </ModalBody>
        <ModalCloseButton />
      </ModalContent>
    </Modal>
  );
};

const LogPro9000: React.FC<{
  getSources: () => Promise<{ id: string; name: string }[]>;
  getLogs: (qs: Record<string, string>) => Promise<string[][]>;
  backLink?: { text: string; to: string };
  downloadEndpoint: string;
  urlState: LogsUrlState;
  updateUrlState: (state: LogsUrlState) => void;
}> = ({
  getSources,
  getLogs,
  backLink,
  downloadEndpoint,
  urlState,
  updateUrlState,
}) => {
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showToolsModal, setShowToolsModal] = useState(false);

  const sources = useSimplePolling(
    {
      fetchData: async () => {
        const sources = await getSources();
        return sources;
      },
    },
    []
  );

  useEffect(() => {
    sources.load();
  }, []);

  return (
    <DarkMode>
      <Flex bg="gray.900" color="gray.50" height="100%" fontSize="md">
        <Stack
          minWidth="160px"
          maxWidth="160px"
          overflowX="hidden"
          overflowY="auto"
          spacing={0}
          py={2}
          bg="gray.800"
          divider={<Divider borderColor="gray.700" />}
        >
          {backLink && (
            <SidebarSection>
              <HStack>
                <SidebarButton
                  variant="link"
                  as={Link}
                  to={backLink.to}
                  leftIcon={<ChevronLeftIcon />}
                >
                  {backLink.text}
                </SidebarButton>
              </HStack>
            </SidebarSection>
          )}
          <SidebarSection>
            <ButtonGroup isAttached>
              <SidebarButton
                variant={urlState.mode === "dateRange" ? "solid" : "outline"}
                onClick={() =>
                  updateUrlState({
                    mode: "dateRange",
                    startTime: "",
                    endTime: "",
                    sources: urlState.sources,
                  })
                }
              >
                Date range
              </SidebarButton>
              <SidebarButton
                variant={urlState.mode === "live" ? "solid" : "outline"}
                onClick={() =>
                  updateUrlState({
                    mode: "live",
                    sources: urlState.sources,
                  })
                }
              >
                Live-mode
              </SidebarButton>
            </ButtonGroup>
            {urlState.mode === "live" ? (
              <>
                <SidebarCheckbox
                  isChecked={stickToBottom}
                  onChange={(event) => {
                    setStickToBottom(event.target.checked);
                  }}
                >
                  Stick to bottom
                </SidebarCheckbox>
              </>
            ) : (
              <>
                <FormControl>
                  <FormLabel htmlFor="startTime">Start time</FormLabel>
                  <DatetimeInput
                    id="startTime"
                    key={urlState.startTime}
                    value={urlState.startTime}
                    onChange={(startTime) =>
                      updateUrlState({ ...urlState, startTime })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="endTime">End time</FormLabel>
                  <DatetimeInput
                    id="endTime"
                    key={urlState.endTime}
                    value={urlState.endTime}
                    onChange={(endTime) =>
                      updateUrlState({ ...urlState, endTime })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Last…</FormLabel>
                  <HStack spacing={1} align="center">
                    {quickDateRanges.map(({ text, getUrlState }, index) => (
                      <SidebarButton
                        key={index}
                        onClick={() =>
                          updateUrlState({ ...urlState, ...getUrlState() })
                        }
                        variant="link"
                        size="xs"
                        color="gray.400"
                        title={`Jump to last ${text}`}
                      >
                        {text}
                      </SidebarButton>
                    ))}
                  </HStack>
                </FormControl>
              </>
            )}
          </SidebarSection>
          <SidebarSection>
            <FormControl>
              <FormLabel>Sources</FormLabel>
              {sources.isLoading ? (
                <LoadingSpinner dark isIndeterminate />
              ) : sources.hasErrored ? (
                <Text fontSize="sm" color="red.400">
                  Error
                </Text>
              ) : sources.data.length === 0 ? (
                <Text fontSize="sm" color="gray.400">
                  No sources
                </Text>
              ) : (
                <Stack spacing={1}>
                  {sources.data.map(({ id, name }, index) => (
                    <SidebarCheckbox
                      key={index}
                      isTruncated
                      isChecked={urlState.sources.includes(id)}
                      onChange={(event) => {
                        updateUrlState({
                          ...urlState,
                          sources: event.target.checked
                            ? [...urlState.sources, id]
                            : urlState.sources.filter((item) => item !== id),
                        });
                      }}
                    >
                      <Text
                        title={name}
                        textOverflow="ellipsis"
                        color={
                          urlState.sources.includes(id) ? "gray.50" : "gray.300"
                        }
                      >
                        {name}
                      </Text>
                    </SidebarCheckbox>
                  ))}
                </Stack>
              )}
            </FormControl>
          </SidebarSection>
          <SidebarSection>
            <HStack>
              <SidebarButton
                variant="outline"
                colorScheme="gray"
                onClick={() => setShowToolsModal(true)}
              >
                Tools
              </SidebarButton>
            </HStack>
          </SidebarSection>
        </Stack>
        <Box flex="1" height="100%" overflowY="hidden" overflowX="hidden">
          {urlState.sources.length === 0 ? (
            <Center minHeight="60px" fontSize="sm" color="gray.400">
              Select log sources from the sidebar
            </Center>
          ) : (
            <LogContent
              key={
                urlState.mode === "live"
                  ? ["live", urlState.sources.join(",")].join("|")
                  : [
                      "dateRange",
                      urlState.sources.join(","),
                      urlState.startTime,
                      urlState.endTime,
                    ].join("|")
              }
              urlState={urlState}
              stickToBottom={stickToBottom}
              setStickToBottom={setStickToBottom}
              getLogs={getLogs}
              sourceColor={
                sources.isLoading
                  ? {}
                  : sources.data.reduce<Record<string, string>>(
                      (obj, { name }, index) => {
                        return {
                          ...obj,
                          [name]:
                            sourceColorPalette[
                              index % sourceColorPalette.length
                            ],
                        };
                      },
                      {}
                    )
              }
            />
          )}
        </Box>
      </Flex>
      {showToolsModal && (
        <ToolsModal
          endpoint={downloadEndpoint}
          urlState={urlState}
          sources={sources.data || []}
          onClose={() => setShowToolsModal(false)}
        />
      )}
    </DarkMode>
  );
};

type LogsUrlState =
  | {
      mode: "live";
      sources: string[];
    }
  | {
      mode: "dateRange";
      sources: string[];
      startTime: string;
      endTime: string;
    };

const parseUrlState = (searchParams: URLSearchParams): LogsUrlState => {
  const sources = (searchParams.get("sources") || "")
    .split(",")
    .filter((source) => source !== "");

  if (searchParams.get("mode") === "live") {
    return {
      mode: "live",
      sources,
    };
  }

  const endTime = isMatch(searchParams.get("endTime"), defaultDatetimeFormat)
    ? parse(searchParams.get("endTime"), defaultDatetimeFormat, new Date())
    : new Date();
  const startTime = isMatch(
    searchParams.get("startTime"),
    defaultDatetimeFormat
  )
    ? parse(searchParams.get("startTime"), defaultDatetimeFormat, new Date())
    : sub(endTime, { hours: 1 });
  return {
    mode: "dateRange",
    sources,
    startTime: format(min([startTime, endTime]), defaultDatetimeFormat),
    endTime: format(endTime, defaultDatetimeFormat),
  };
};

const urlStateToURLSearchParams = (state: LogsUrlState): URLSearchParams => {
  return new URLSearchParams({
    ...state,
    sources: state.sources.join(","),
  });
};

const LogsPage: React.FC<{
  backLink: Parameters<typeof LogPro9000>[0]["backLink"];
  downloadEndpoint: Parameters<typeof LogPro9000>[0]["downloadEndpoint"];
  getSources: Parameters<typeof LogPro9000>[0]["getSources"];
  getLogs: Parameters<typeof LogPro9000>[0]["getLogs"];
}> = ({ backLink, downloadEndpoint, getSources, getLogs }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lokiServiceObj = useServiceObj("loki");

  const urlState = parseUrlState(searchParams);

  const updateUrlState = (newUrlState: LogsUrlState): void => {
    const params = urlStateToURLSearchParams(newUrlState);
    const validUrlState = parseUrlState(params);
    const validParams = urlStateToURLSearchParams(validUrlState);
    if (validParams.toString() !== searchParams.toString()) {
      setSearchParams(validParams);
    }
  };

  useEffect(() => {
    document.body.classList.add("disable-overflow-y");
    return function cleanup() {
      document.body.classList.remove("disable-overflow-y");
    };
  }, []);

  if (!lokiServiceObj.isEnabled) {
    return null;
  }

  return (
    <LogPro9000
      urlState={urlState}
      updateUrlState={updateUrlState}
      backLink={backLink}
      downloadEndpoint={downloadEndpoint}
      getSources={getSources}
      getLogs={getLogs}
    />
  );
};

export const SystemLogsPage: React.FC<{ category: string }> = ({
  category,
}) => {
  return (
    <>
      <Helmet>
        <title>{category} logs - Manage - Shipmight</title>
      </Helmet>
      <LogsPage
        backLink={{
          to: "/manage",
          text: "Back to Manage",
        }}
        downloadEndpoint={`/api/v1/system-logs/${category}`}
        getSources={() =>
          get("/v1/system-logs/{category}/sources", { category }, {}, 200)
        }
        getLogs={(qs: Record<string, string>) =>
          get("/v1/system-logs/{category}", { category }, qs, 200)
        }
      />
    </>
  );
};

export const ProjectLogsPage: React.FC = () => {
  const { projectId } = useParams();
  const [projectName, setProjectName] = useState<string>();

  useEffect(() => {
    get("/v1/projects/{projectId}", { projectId }, {}, 200)
      .then((project) => {
        setProjectName(project.name);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [projectId]);

  return (
    <>
      <Helmet>
        <title>Logs {projectName ? `- ${projectName}` : ""} - Shipmight</title>
      </Helmet>
      <LogsPage
        backLink={{
          to: `/projects/${projectId}`,
          text: projectName ? projectName : "Back",
        }}
        downloadEndpoint={`/api/v1/projects/${projectId}/logs`}
        getSources={() =>
          get("/v1/projects/{projectId}/logs/sources", { projectId }, {}, 200)
        }
        getLogs={(qs: Record<string, string>) =>
          get("/v1/projects/{projectId}/logs", { projectId }, qs, 200)
        }
      />
    </>
  );
};
