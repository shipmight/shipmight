import { jest } from "@jest/globals";
import Apps from "../models/Apps";

jest.mock("../models/Apps");

export const mockApps = () => {
  const mockedApps = jest.mocked(Apps);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedApps;
};
