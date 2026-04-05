import { describe, expect, it } from "vitest";
import { Gender, StudentStatus } from "@prisma/client";
import { competitionRank, filterTopByGender, generateRemark, isOperationalStatus, scoreToGrade } from "@/lib/grading";

describe("grading helpers", () => {
  it("maps raw scores to CBC grades", () => {
    expect(scoreToGrade(90)).toBe("EE");
    expect(scoreToGrade(74)).toBe("ME");
    expect(scoreToGrade(35)).toBe("AE");
    expect(scoreToGrade(12)).toBe("BE");
  });

  it("creates competition rankings with deterministic tie handling", () => {
    const ranks = competitionRank([
      { totalScore: 98 },
      { totalScore: 98 },
      { totalScore: 70 },
      { totalScore: 65 },
    ]);

    expect(ranks).toEqual([1, 1, 3, 4]);
  });

  it("generates contextual remarks per band", () => {
    expect(generateRemark(80)).toMatch(/Outstanding/);
    expect(generateRemark(55)).toMatch(/Good/);
    expect(generateRemark(30)).toMatch(/Fair/);
    expect(generateRemark(15)).toMatch(/Needs/);
  });

  it("flags operational student statuses", () => {
    expect(isOperationalStatus(StudentStatus.ACTIVE)).toBe(true);
    expect(isOperationalStatus(StudentStatus.PROMOTED)).toBe(true);
    expect(isOperationalStatus(StudentStatus.GRADUATED)).toBe(false);
    expect(isOperationalStatus(StudentStatus.TRANSFERRED)).toBe(false);
  });

  it("filters top performers by gender and limit", () => {
    const items = [
      { gender: Gender.MALE, totalScore: 400 },
      { gender: Gender.MALE, totalScore: 380 },
      { gender: Gender.FEMALE, totalScore: 410 },
      { gender: Gender.MALE, totalScore: 360 },
    ];

    expect(filterTopByGender(items, Gender.MALE, 2)).toEqual(items.slice(0, 2));
    expect(filterTopByGender(items, Gender.FEMALE, 2)).toEqual([items[2]]);
  });
});
