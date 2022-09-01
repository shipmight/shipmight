import { Response } from "express";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import env from "../utils/env";
import AuthorizationError from "./AuthorizationError";

type BearerTokenPayload = {
  username: string;
  mustChangePassword?: boolean;
};

type FullBearerTokenPayload = BearerTokenPayload & JwtPayload;

const tokenLifetimeSeconds = 5 * 60;

export const signBearerToken = (
  { username, mustChangePassword }: BearerTokenPayload,
  exp = Math.floor(Date.now() / 1000) + tokenLifetimeSeconds
): string => {
  if (!env.jwtSecret) {
    throw new Error("JWT secret is not defined");
  }

  const jwtPayload: FullBearerTokenPayload = {
    exp,
    username,
  };
  if (mustChangePassword) {
    jwtPayload.mustChangePassword = true;
  }
  const jwt = sign(jwtPayload, env.jwtSecret);
  return jwt;
};

function isBearerTokenPayload(
  payload: string | JwtPayload
): payload is BearerTokenPayload & JwtPayload {
  if (
    typeof payload === "object" &&
    typeof payload.username === "string" &&
    typeof payload.exp === "number" &&
    typeof payload.iat === "number"
  ) {
    return true;
  }
  return false;
}

export const verifyBearerToken = (
  bearerToken: string
): FullBearerTokenPayload => {
  if (!env.jwtSecret) {
    throw new Error("JWT secret is not defined");
  }

  let payload: JwtPayload | string;
  try {
    payload = verify(bearerToken, env.jwtSecret);
  } catch (error) {
    throw new AuthorizationError("unable to verify bearer token");
  }

  if (!isBearerTokenPayload(payload)) {
    throw new AuthorizationError("decoded payload is malformed");
  }

  const secondsUntilJwtExpiry = payload.exp - Math.floor(Date.now() / 1000);
  if (secondsUntilJwtExpiry <= 0) {
    throw new AuthorizationError("bearer token has expired");
  }

  return payload;
};

export const writeBearerTokenCookie = (res: Response, jwt: string): void => {
  res.cookie("shipmightBearerToken", jwt, {
    httpOnly: true,
    sameSite: "strict",

    // TODO when able to set a hostname for Shipmight UI, and it may have SSL, these should be enabled
    // secure: true,
    // domain: 'example.com',
  });
};
