import { trimSlashes, withLeadingSlash, withTrailingSlash } from "./string";

describe("trimSlashes", () => {
  it("works", () => {
    expect(trimSlashes("")).toEqual("");
    expect(trimSlashes("/")).toEqual("");
    expect(trimSlashes("/asd")).toEqual("asd");
    expect(trimSlashes("/asd/")).toEqual("asd");
    expect(trimSlashes("asd/")).toEqual("asd");
  });
});

describe("withTrailingSlash", () => {
  it("works", () => {
    expect(withTrailingSlash("")).toEqual("/");
    expect(withTrailingSlash("/")).toEqual("/");
    expect(withTrailingSlash("asd")).toEqual("asd/");
    expect(withTrailingSlash("/asd")).toEqual("/asd/");
    expect(withTrailingSlash("/asd/")).toEqual("/asd/");
    expect(withTrailingSlash("asd/")).toEqual("asd/");
  });
});

describe("withLeadingSlash", () => {
  it("works", () => {
    expect(withLeadingSlash("")).toEqual("/");
    expect(withLeadingSlash("/")).toEqual("/");
    expect(withLeadingSlash("asd")).toEqual("/asd");
    expect(withLeadingSlash("/asd")).toEqual("/asd");
    expect(withLeadingSlash("/asd/")).toEqual("/asd/");
    expect(withLeadingSlash("asd/")).toEqual("/asd/");
  });
});
