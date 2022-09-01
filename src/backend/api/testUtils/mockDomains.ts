import { jest } from "@jest/globals";
import Domains from "../models/Domains";

jest.mock("../models/Domains");

export const mockDomains = () => {
  const mockedDomains = jest.mocked(Domains);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedDomains;
};
