import { useToken } from "@chakra-ui/system";
import React from "react";

export const Logo: React.FC<{
  color: string;
  height: number;
}> = ({ color, height }) => {
  const [colorValue] = useToken("colors", [color]);

  return (
    <svg
      width={height}
      height={height}
      viewBox="0 0 49 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={colorValue} fillRule="evenodd">
        <path d="M24.004 0c13.257 0 24.004 10.745 24.004 24S37.26 48 24.004 48C10.747 48 0 37.255 0 24S10.747 0 24.004 0Zm0 3.375C12.611 3.375 3.376 12.609 3.376 24c0 11.39 9.235 20.625 20.628 20.625S44.632 35.391 44.632 24c0-11.39-9.235-20.625-20.628-20.625Z" />
        <path d="M25.786 15.75c.535.04 1.063.101 1.585.181-5.13 4.328-9.54 12.865-19.327 14.63-.3-.728-.552-1.48-.75-2.253 4.853-5.006 8.184-13.334 18.492-12.558Z" />
        <path d="M37.037 15.75c.888.291 1.787.672 2.686 1.132A17.172 17.172 0 0 1 41.257 24c0 9.527-7.725 17.25-17.253 17.25-6.462 0-12.094-3.552-15.05-8.81 14.586-2.61 17.24-20.247 28.083-16.69Z" />
      </g>
    </svg>
  );
};
