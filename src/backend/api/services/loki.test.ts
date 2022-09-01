import {
  combineLogStreams,
  getLokiLogs2,
  parseLokiLimitsFromConfigText,
} from "./loki";

describe("combineLogStreams", () => {
  it("combines streams in timely order", () => {
    const stream1: [string, string][] = [
      ["1643707174317397410", "stream-1-0"],
      ["1643707174310051406", "stream-1-0a"],
      ["1643707174244865301", "stream-1-1"],
      ["1643707174244865300", "stream-1-2"],
    ];

    const stream2: [string, string][] = [
      ["1643707174317397410", "stream-2-0"],
      ["1643707174310051407", "stream-2-1"],
      ["1643707174310051406", "stream-2-1a"],
      ["1643707174244865300", "stream-2-2"],
    ];

    const combined = combineLogStreams([
      { values: stream1 },
      { values: stream2 },
    ]);
    expect(combined.map((item) => item[1])).toEqual([
      "stream-2-0",
      "stream-1-0",
      "stream-2-1",
      "stream-2-1a",
      "stream-1-0a",
      "stream-1-1",
      "stream-2-2",
      "stream-1-2",
    ]);
  });
});

describe("parseLokiLimitsFromConfigText", () => {
  it("returns defaults if cannot parse", () => {
    const expected = {
      maxQueryLengthNs: "2595600000000000",
      queryResultsMax: 5000,
    };
    expect(
      parseLokiLimitsFromConfigText(`
        foobar: something
      `)
    ).toEqual(expected);
    expect(
      parseLokiLimitsFromConfigText(`
        max_entries_limit_per_query: malformed
      `)
    ).toEqual(expected);
    expect(
      parseLokiLimitsFromConfigText(`
        max_query_length: malformed
      `)
    ).toEqual(expected);
  });
  it("parses limits", () => {
    expect(
      parseLokiLimitsFromConfigText(`
        max_entries_limit_per_query: 123
        max_query_length: 2d5h
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "maxQueryLengthNs": "190800000000000",
        "queryResultsMax": 123,
      }
    `);
  });
});

const fakeQueryLogs = (
  data: {
    [sourceName: string]: [string, string][];
  },
  maxQueryLengthNs
): ((
  params: Parameters<Parameters<typeof getLokiLogs2>[2]["queryLogs"]>[0]
) => Promise<[string, string][]>) => {
  return async (qs) => {
    const sourceData = data[qs.query] || [];

    if (BigInt(qs.end) - BigInt(qs.start) > BigInt(maxQueryLengthNs)) {
      throw new Error("exceeded maxQueryLengthNs");
    }

    if (qs.direction === "forward") {
      const firstIndex = sourceData.findIndex(([ns]) => ns >= qs.start);
      if (firstIndex === -1) {
        return [];
      }
      return sourceData
        .slice(firstIndex)
        .filter(([ns]) => ns <= qs.end)
        .slice(0, qs.limit);
    }

    const reversed = [...sourceData].reverse();
    const firstIndex = reversed.findIndex(([ns]) => ns <= qs.end);
    if (firstIndex === -1) {
      return [];
    }
    return reversed
      .slice(firstIndex)
      .filter(([ns]) => ns >= qs.start)
      .slice(0, qs.limit)
      .reverse();
  };
};

describe("fakeQueryLogs", () => {
  const queryLogs = fakeQueryLogs(
    {
      "{app=source1}": [
        ["35010", "source1 line 1"],
        ["35020", "source1 line 2"],
        ["35040", "source1 line 3"],
        ["35050", "source1 line 4"],
      ],
      "{app=source2}": [["35030", "source2 line 1"]],
    },
    "10000"
  );

  it("works forward", async () => {
    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "forward",
        start: "34000",
        end: "35000",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`Array []`);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "forward",
        start: "35000",
        end: "37000",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35010",
          "source1 line 1",
        ],
        Array [
          "35020",
          "source1 line 2",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "forward",
        start: "35040",
        end: "37000",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35040",
          "source1 line 3",
        ],
        Array [
          "35050",
          "source1 line 4",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "forward",
        start: "35050",
        end: "37000",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35050",
          "source1 line 4",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "forward",
        start: "35080",
        end: "37000",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`Array []`);
  });

  it("works backward", async () => {
    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "backward",
        start: "34000",
        end: "35000",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`Array []`);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "backward",
        start: "35000",
        end: "35010",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35010",
          "source1 line 1",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "backward",
        start: "35000",
        end: "35020",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35010",
          "source1 line 1",
        ],
        Array [
          "35020",
          "source1 line 2",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "backward",
        start: "35000",
        end: "35040",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35020",
          "source1 line 2",
        ],
        Array [
          "35040",
          "source1 line 3",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "backward",
        start: "35000",
        end: "35050",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35040",
          "source1 line 3",
        ],
        Array [
          "35050",
          "source1 line 4",
        ],
      ]
    `);

    expect(
      await queryLogs({
        query: "{app=source1}",
        direction: "backward",
        start: "35000",
        end: "35060",
        limit: 2,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "35040",
          "source1 line 3",
        ],
        Array [
          "35050",
          "source1 line 4",
        ],
      ]
    `);
  });
});

describe("getLokiLogs2", () => {
  describe("forward", () => {
    it("gets logs for download", async () => {
      const queryLogs = fakeQueryLogs(
        {
          "{app=source1}": [
            ["35010", "source1 line 1"],
            ["35020", "source1 line 2"],
            ["35040", "source1 line 3"],
            ["35050", "source1 line 4"],
          ],
          "{app=source2}": [["35030", "source2 line 1"]],
        },
        "10000"
      );

      const logs = await getLokiLogs2(
        [
          { name: "source1", logQl: "{app=source1}" },
          { name: "source2", logQl: "{app=source2}" },
        ],
        {
          startNs: "35000",
          endNs: "37000",
          limit: 50,
        },
        {
          queryLogs,
          getLokiLimits: async () => ({
            maxQueryLengthNs: "10000",
            queryResultsMax: 2,
          }),
        }
      );

      expect(logs).toMatchInlineSnapshot(`
              Array [
                Array [
                  "35010",
                  "source1",
                  "source1 line 1",
                ],
                Array [
                  "35020",
                  "source1",
                  "source1 line 2",
                ],
                Array [
                  "35030",
                  "source2",
                  "source2 line 1",
                ],
                Array [
                  "35040",
                  "source1",
                  "source1 line 3",
                ],
                Array [
                  "35050",
                  "source1",
                  "source1 line 4",
                ],
              ]
          `);
    });

    it("gets logs for download with limit", async () => {
      const queryLogs = fakeQueryLogs(
        {
          "{app=source1}": [
            ["35010", "source1 line 1"],
            ["35020", "source1 line 2"],
            ["35040", "source1 line 3"],
            ["35050", "source1 line 4"],
          ],
          "{app=source2}": [["35030", "source2 line 1"]],
        },
        "10000"
      );

      const logs = await getLokiLogs2(
        [
          { name: "source1", logQl: "{app=source1}" },
          { name: "source2", logQl: "{app=source2}" },
        ],
        {
          startNs: "35000",
          endNs: "37000",
          limit: 4,
        },
        {
          queryLogs,
          getLokiLimits: async () => ({
            maxQueryLengthNs: "10000",
            queryResultsMax: 2,
          }),
        }
      );

      expect(logs).toMatchInlineSnapshot(`
              Array [
                Array [
                  "35010",
                  "source1",
                  "source1 line 1",
                ],
                Array [
                  "35020",
                  "source1",
                  "source1 line 2",
                ],
                Array [
                  "35030",
                  "source2",
                  "source2 line 1",
                ],
                Array [
                  "35040",
                  "source1",
                  "source1 line 3",
                ],
              ]
          `);
    });

    it("batches time interval based on loki config", async () => {
      const queryLogs = fakeQueryLogs(
        {
          "{app=source1}": [
            ["31000", "source1 line 1"],
            ["33000", "source1 line 2"],
            ["35000", "source1 line 3"],
            ["37000", "source1 line 4"],
            ["39000", "source1 line 5"],
          ],
        },
        "0000000000000001000"
      );

      const logs = await getLokiLogs2(
        [{ name: "source1", logQl: "{app=source1}" }],
        {
          startNs: "33000",
          endNs: "37000",
          limit: 50,
        },
        {
          queryLogs,
          getLokiLimits: async () => ({
            maxQueryLengthNs: "0000000000000001000",
            queryResultsMax: 2,
          }),
        }
      );

      expect(logs).toMatchInlineSnapshot(`
              Array [
                Array [
                  "33000",
                  "source1",
                  "source1 line 2",
                ],
                Array [
                  "35000",
                  "source1",
                  "source1 line 3",
                ],
                Array [
                  "37000",
                  "source1",
                  "source1 line 4",
                ],
              ]
          `);
    });
  });

  describe("backward", () => {
    it("gets logs for browsing", async () => {
      const queryLogs = fakeQueryLogs(
        {
          "{app=source1}": [
            ["35010", "source1 line 1"],
            ["35020", "source1 line 2"],
            ["35040", "source1 line 3"],
            ["35050", "source1 line 4"],
          ],
          "{app=source2}": [["35030", "source2 line 1"]],
        },
        "10000"
      );

      const logs = await getLokiLogs2(
        [
          { name: "source1", logQl: "{app=source1}" },
          { name: "source2", logQl: "{app=source2}" },
        ],
        {
          startNs: "37000",
          endNs: "35000",
          limit: 50,
        },
        {
          queryLogs,
          getLokiLimits: async () => ({
            maxQueryLengthNs: "10000",
            queryResultsMax: 2,
          }),
        }
      );

      expect(logs).toMatchInlineSnapshot(`
              Array [
                Array [
                  "35010",
                  "source1",
                  "source1 line 1",
                ],
                Array [
                  "35020",
                  "source1",
                  "source1 line 2",
                ],
                Array [
                  "35030",
                  "source2",
                  "source2 line 1",
                ],
                Array [
                  "35040",
                  "source1",
                  "source1 line 3",
                ],
                Array [
                  "35050",
                  "source1",
                  "source1 line 4",
                ],
              ]
          `);
    });

    it("gets logs for browsing with limit", async () => {
      const queryLogs = fakeQueryLogs(
        {
          "{app=source1}": [
            ["35010", "source1 line 1"],
            ["35020", "source1 line 2"],
            ["35040", "source1 line 3"],
            ["35050", "source1 line 4"],
          ],
          "{app=source2}": [["35030", "source2 line 1"]],
        },
        "10000"
      );

      const logs = await getLokiLogs2(
        [
          { name: "source1", logQl: "{app=source1}" },
          { name: "source2", logQl: "{app=source2}" },
        ],
        {
          startNs: "37000",
          endNs: "35000",
          limit: 4,
        },
        {
          queryLogs,
          getLokiLimits: async () => ({
            maxQueryLengthNs: "10000",
            queryResultsMax: 2,
          }),
        }
      );

      expect(logs).toMatchInlineSnapshot(`
        Array [
          Array [
            "35020",
            "source1",
            "source1 line 2",
          ],
          Array [
            "35030",
            "source2",
            "source2 line 1",
          ],
          Array [
            "35040",
            "source1",
            "source1 line 3",
          ],
          Array [
            "35050",
            "source1",
            "source1 line 4",
          ],
        ]
      `);
    });

    it("batches time interval based on loki config", async () => {
      const queryLogs = fakeQueryLogs(
        {
          "{app=source1}": [
            ["31000", "source1 line 1"],
            ["33000", "source1 line 2"],
            ["35000", "source1 line 3"],
            ["37000", "source1 line 4"],
            ["39000", "source1 line 5"],
          ],
        },
        "0000000000000001000"
      );

      const logs = await getLokiLogs2(
        [{ name: "source1", logQl: "{app=source1}" }],
        {
          startNs: "37000",
          endNs: "33000",
          limit: 50,
        },
        {
          queryLogs,
          getLokiLimits: async () => ({
            maxQueryLengthNs: "0000000000000001000",
            queryResultsMax: 2,
          }),
        }
      );

      expect(logs).toMatchInlineSnapshot(`
        Array [
          Array [
            "33000",
            "source1",
            "source1 line 2",
          ],
          Array [
            "35000",
            "source1",
            "source1 line 3",
          ],
          Array [
            "37000",
            "source1",
            "source1 line 4",
          ],
        ]
      `);
    });
  });
});
