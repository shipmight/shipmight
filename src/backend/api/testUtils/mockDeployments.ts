import { jest } from "@jest/globals";
import Deployments from "../models/Deployments";

jest.mock("../models/Deployments");

export const mockDeployments = () => {
  const mockedDeployments = jest.mocked(Deployments);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedDeployments;
};
