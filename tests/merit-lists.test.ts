import { describe, expect, it } from "vitest";
import { Gender } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { buildMeritEntries } from "@/lib/services/merit-lists";

describe("buildMeritEntries", () => {
  it("applies competition ranking rules deterministically", () => {
    const result = buildMeritEntries([
      {
        studentId: "bravo",
        streamId: "north",
        gender: Gender.MALE,
        totalScore: 450,
        subjectCount: 5,
      },
      {
        studentId: "alpha",
        streamId: "south",
        gender: Gender.FEMALE,
        totalScore: 450,
        subjectCount: 5,
      },
      {
        studentId: "charlie",
        streamId: "north",
        gender: Gender.MALE,
        totalScore: 430,
        subjectCount: 5,
      },
    ]);

    expect(result.map((entry) => entry.studentId)).toEqual(["alpha", "bravo", "charlie"]);
    expect(result.map((entry) => entry.classRank)).toEqual([1, 1, 3]);
  });

  it("calculates stream ranks and improvement deltas", () => {
    const result = buildMeritEntries([
      {
        studentId: "alpha",
        streamId: "north",
        gender: Gender.MALE,
        totalScore: 410.456,
        subjectCount: 5,
        previousAverage: 70,
      },
      {
        studentId: "bravo",
        streamId: "north",
        gender: Gender.FEMALE,
        totalScore: 405.12,
        subjectCount: 5,
      },
      {
        studentId: "charlie",
        streamId: "south",
        gender: Gender.MALE,
        totalScore: 399.99,
        subjectCount: 5,
        previousAverage: 82.55,
      },
    ]);

    const alpha = result.find((entry) => entry.studentId === "alpha")!;
    const bravo = result.find((entry) => entry.studentId === "bravo")!;
    const charlie = result.find((entry) => entry.studentId === "charlie")!;

    expect(alpha.streamRank).toBe(1);
    expect(bravo.streamRank).toBe(2);
    expect(charlie.streamRank).toBe(1);
    expect(alpha.improvement).toBeCloseTo(alpha.averageScore - 70, 2);
    expect(charlie.improvement).toBeCloseTo(charlie.averageScore - 82.55, 2);
    expect(bravo.improvement).toBeUndefined();
  });

  it("fails fast if subjectCount is zero", () => {
    expect(() =>
      buildMeritEntries([
        {
          studentId: "delta",
          streamId: "west",
          gender: Gender.FEMALE,
          totalScore: 200,
          subjectCount: 0,
        },
      ]),
    ).toThrow(AppError);
  });
});
