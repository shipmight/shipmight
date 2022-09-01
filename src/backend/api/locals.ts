import { Response } from "express";
import { components } from "./generated/apiSchema";

// Simple functions to work with res.locals in a type-safe way. This is much
// nicer than trying to type and type check the Response objects in Express.

// requestId

type LocalsRequestId = string;

export const setLocalsRequestId = (
  res: Response,
  requestId: LocalsRequestId
): void => {
  res.locals.requestId = requestId;
};

export const readLocalsRequestId = (res: Response): LocalsRequestId => {
  if (typeof res.locals.requestId === "undefined") {
    throw new Error("tried to read res.locals.requestId but it is not defined");
  }
  return res.locals.requestId;
};

// me

interface LocalsMe {
  username: string;
  mustChangePassword: boolean | undefined;
}

export const setLocalsMe = (res: Response, me: LocalsMe): void => {
  res.locals.me = me;
};

export const readLocalsMe = (res: Response): LocalsMe => {
  if (typeof res.locals.me === "undefined") {
    throw new Error("tried to read res.locals.me but it is not defined");
  }
  return res.locals.me;
};

// registry

type LocalsRegistry = components["schemas"]["Registry"];

export const setLocalsRegistry = (
  res: Response,
  registry: LocalsRegistry
): void => {
  res.locals.registry = registry;
};

export const readLocalsRegistry = (res: Response): LocalsRegistry => {
  if (typeof res.locals.registry === "undefined") {
    throw new Error("tried to read res.locals.registry but it is not defined");
  }
  return res.locals.registry;
};

// user

type LocalsUser = components["schemas"]["User"];

export const setLocalsUser = (res: Response, user: LocalsUser): void => {
  res.locals.user = user;
};

export const readLocalsUser = (res: Response): LocalsUser => {
  if (typeof res.locals.user === "undefined") {
    throw new Error("tried to read res.locals.user but it is not defined");
  }
  return res.locals.user;
};

// master domain

type LocalsMasterDomain = components["schemas"]["MasterDomain"];

export const setLocalsMasterDomain = (
  res: Response,
  masterDomain: LocalsMasterDomain
): void => {
  res.locals.masterDomain = masterDomain;
};

export const readLocalsMasterDomain = (res: Response): LocalsMasterDomain => {
  if (typeof res.locals.masterDomain === "undefined") {
    throw new Error(
      "tried to read res.locals.masterDomain but it is not defined"
    );
  }
  return res.locals.masterDomain;
};

// project

type LocalsProject = components["schemas"]["Project"];

export const setLocalsProject = (
  res: Response,
  project: LocalsProject
): void => {
  res.locals.project = project;
};

export const readLocalsProject = (res: Response): LocalsProject => {
  if (typeof res.locals.project === "undefined") {
    throw new Error("tried to read res.locals.project but it is not defined");
  }
  return res.locals.project;
};

// domain

type LocalsDomain = components["schemas"]["Domain"];

export const setLocalsDomain = (res: Response, domain: LocalsDomain): void => {
  res.locals.domain = domain;
};

export const readLocalsDomain = (res: Response): LocalsDomain => {
  if (typeof res.locals.domain === "undefined") {
    throw new Error("tried to read res.locals.domain but it is not defined");
  }
  return res.locals.domain;
};

// file

type LocalsFile = components["schemas"]["File"];

export const setLocalsFile = (res: Response, file: LocalsFile): void => {
  res.locals.file = file;
};

export const readLocalsFile = (res: Response): LocalsFile => {
  if (typeof res.locals.file === "undefined") {
    throw new Error("tried to read res.locals.file but it is not defined");
  }
  return res.locals.file;
};

// app

type LocalsApp = components["schemas"]["App"];

export const setLocalsApp = (res: Response, app: LocalsApp): void => {
  res.locals.app = app;
};

export const readLocalsApp = (res: Response): LocalsApp => {
  if (typeof res.locals.app === "undefined") {
    throw new Error("tried to read res.locals.app but it is not defined");
  }
  return res.locals.app;
};

// deployHook

type LocalsDeployHook = components["schemas"]["DeployHook"];

export const setLocalsDeployHook = (
  res: Response,
  deployHook: LocalsDeployHook
): void => {
  res.locals.deployHook = deployHook;
};

export const readLocalsDeployHook = (res: Response): LocalsDeployHook => {
  if (typeof res.locals.deployHook === "undefined") {
    throw new Error(
      "tried to read res.locals.deployHook but it is not defined"
    );
  }
  return res.locals.deployHook;
};
