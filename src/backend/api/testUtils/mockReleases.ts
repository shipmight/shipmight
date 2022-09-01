import { jest } from "@jest/globals";
import Releases from "../models/Releases";

jest.mock("../models/Releases");

export const mockReleases = () => {
  const mockedReleases = jest.mocked(Releases);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedReleases;
};
