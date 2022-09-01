import { jest } from "@jest/globals";
import MasterDomains from "../models/MasterDomains";

jest.mock("../models/MasterDomains");

export const mockMasterDomains = () => {
  const mockedMasterDomains = jest.mocked(MasterDomains);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedMasterDomains;
};
