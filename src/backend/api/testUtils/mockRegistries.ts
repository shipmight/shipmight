import { jest } from "@jest/globals";
import Registries from "../models/Registries";

jest.mock("../models/Registries");

export const mockRegistries = () => {
  const mockedRegistries = jest.mocked(Registries);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedRegistries;
};
