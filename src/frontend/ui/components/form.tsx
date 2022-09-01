import { ChevronDownIcon, CheckIcon, RepeatIcon } from "@chakra-ui/icons";
import {
  Button,
  Divider,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Radio,
  Box,
  Stack,
  Text,
} from "@chakra-ui/react";
import React, { ReactElement, useEffect, useState } from "react";
import { EmptyIcon } from "./icon";

export const BlockOption: React.FC<{
  isSelected: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
}> = ({ isSelected, onSelect, label, description }) => {
  return (
    <HStack
      as="label"
      spacing={2}
      align="start"
      p={3}
      cursor="pointer"
      bg={isSelected ? undefined : "gray.50"}
      color={isSelected ? "gray.900" : "gray.500"}
      borderLeftWidth="3px"
      borderColor={isSelected ? "blue.500" : "transparent"}
    >
      <Radio
        onChange={() => {
          onSelect();
        }}
        isChecked={isSelected}
        mt={1}
      />
      <Stack spacing={1}>
        <Text fontWeight="medium">{label}</Text>
        {description && <Text fontSize="sm">{description}</Text>}
      </Stack>
    </HStack>
  );
};

export const BlockOptions: React.FC = ({ children }) => {
  return (
    <Stack
      spacing={0}
      divider={<Divider borderColor="gray.200" />}
      borderColor="gray.200"
      borderWidth="1px"
      borderRadius="6px"
      overflow="hidden"
    >
      {children}
    </Stack>
  );
};

export function Select<
  T extends Record<string, unknown>,
  P extends keyof T,
  D extends keyof T
>({
  valueProp,
  displayProp,
  value,
  isDisabled,
  onChange,
  onClear,
  getItems,
  renderItem,
  placeholder,
  emptyText,
  zIndex,
}: {
  valueProp: P;
  displayProp: D;
  value: T[P];
  isDisabled?: boolean;
  onChange: (newValue: T[P], items: T[]) => void;
  onClear?: () => void;
  getItems: () => Promise<T[]>;
  renderItem?: (item: T) => ReactElement;
  placeholder: string;
  emptyText?: string;
  zIndex?: number;
}): ReactElement {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    const items = await getItems();
    setItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [getItems]);

  isDisabled = isDisabled || isLoading;

  return (
    <HStack>
      <Box>
        <Menu>
          <MenuButton
            as={Button}
            variant="outline"
            rightIcon={<ChevronDownIcon />}
            isDisabled={isDisabled}
          >
            {isLoading || value === ""
              ? placeholder
              : items.find((item) => item[valueProp] === value)[displayProp]}
          </MenuButton>
          {!isLoading && (
            <MenuList zIndex={zIndex}>
              {onClear && (
                <MenuItem
                  key="clear"
                  icon={value === "" ? <CheckIcon /> : <EmptyIcon />}
                  onClick={() => {
                    onClear();
                  }}
                >
                  <Text color="gray.500">{placeholder}</Text>
                </MenuItem>
              )}
              {items.length ? (
                items.map((item, index) => (
                  <MenuItem
                    key={index}
                    icon={
                      item[valueProp] === value ? <CheckIcon /> : <EmptyIcon />
                    }
                    onClick={() => {
                      onChange(item[valueProp], items);
                    }}
                  >
                    {renderItem ? renderItem(item) : item[displayProp]}
                  </MenuItem>
                ))
              ) : (
                <MenuItem isDisabled>{emptyText || "No items"}</MenuItem>
              )}
            </MenuList>
          )}
        </Menu>
      </Box>
      <Button
        size="sm"
        colorScheme="gray"
        variant="outline"
        isDisabled={isDisabled}
        title="Refresh list"
        onClick={() => {
          refresh();
        }}
      >
        <RepeatIcon />
      </Button>
    </HStack>
  );
}
