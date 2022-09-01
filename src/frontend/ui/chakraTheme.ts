import { extendTheme } from "@chakra-ui/react";

const sizes = {
  container: {
    xs: "400px",
  },
};

const fontSizes = {
  xs: "0.65rem",
  sm: "0.75rem",
  md: "0.875rem",
  lg: "1rem",
  xl: "1.125rem",
  "2xl": "1.25rem",
  "3xl": "1.5rem",
  "4xl": "1.875rem",
  "5xl": "2.25rem",
  "6xl": "3rem",
  "7xl": "3.75rem",
  "8xl": "4.5rem",
  "9xl": "6rem",
};

const colors = {
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  purple: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
  },

  green: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },

  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },

  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },
};

const Button = {
  defaultProps: {
    size: "sm",
  },
  sizes: {
    sm: {
      fontSize: "md",
    },
  },
};

const Heading = {
  baseStyle: {
    fontWeight: "regular",
  },
};

const Modal = {
  baseStyle: {
    header: {
      fontWeight: "regular",
    },
  },
};

const chakraTheme = extendTheme({
  sizes,
  fontSizes,
  colors,
  components: {
    Button,
    Heading,
    Modal,
  },
});

export default chakraTheme;
