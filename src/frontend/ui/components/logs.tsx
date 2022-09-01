import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  HStack,
  Stack,
} from "@chakra-ui/react";
import debounce from "lodash.debounce";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export const LogBox: React.FC<{
  data: string[][];
  isLoading?: boolean;
  noLogsText?: string;
  viewInLogsUrl?: string;
}> = ({ data, isLoading, noLogsText, viewInLogsUrl }) => {
  const [stickToBottom, setStickToBottom] = useState(true);
  const containerRef = useRef<HTMLDivElement>();

  useEffect(() => {
    if (stickToBottom && containerRef.current) {
      containerRef.current.scrollTo(0, containerRef.current.scrollHeight);
    }
  }, [stickToBottom, data, containerRef.current]);

  useEffect(() => {
    if (containerRef.current) {
      const onScroll = debounce(
        () => {
          const { scrollHeight, clientHeight, scrollTop } =
            containerRef.current;
          const userScrolledToBottom =
            Math.abs(clientHeight + scrollTop - scrollHeight) < 5;
          setStickToBottom(userScrolledToBottom);
        },
        100,
        { leading: true }
      );
      containerRef.current.addEventListener("scroll", onScroll);
      return function cleanup() {
        containerRef.current.removeEventListener("scroll", onScroll);
      };
    }
  }, [containerRef.current]);

  return (
    <Stack spacing={1} height="100%">
      <Box
        ref={containerRef}
        flex="1"
        overflowY="scroll"
        overflowX="hidden"
        bg="gray.900"
        color="gray.200"
        fontFamily="mono"
        fontSize="xs"
        py={1}
        maxHeight="400px"
      >
        {isLoading && (
          <Box px={2} py={1}>
            <CircularProgress size={4} color="gray.500" isIndeterminate />
          </Box>
        )}
        {!isLoading && !data.length && (
          <Box px={2} color="gray.300">
            {noLogsText || "No logs during selected timeframe"}
          </Box>
        )}
        {data.map(([datetime, , , text], index) => (
          <Box key={index} px={2} _hover={{ bg: "gray.700" }}>
            <Box as="span" minWidth="220px" color="gray.400">
              {datetime}{" "}
            </Box>
            {text}
          </Box>
        ))}
      </Box>
      <HStack spacing={2} justify="space-between" height="24px">
        <Box>
          {viewInLogsUrl && (
            <Button
              as={Link}
              to={viewInLogsUrl}
              size="xs"
              variant="outline"
              colorScheme="gray"
            >
              View in Logs
            </Button>
          )}
        </Box>
        <Checkbox
          size="sm"
          colorScheme="blue"
          isChecked={stickToBottom}
          onChange={(event) => {
            setStickToBottom(event.target.checked);
          }}
        >
          Stick to bottom
        </Checkbox>
      </HStack>
    </Stack>
  );
};
