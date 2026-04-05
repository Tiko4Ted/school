import { Gender, StudentStatus } from "@prisma/client";

type RankedItem = {
  totalScore: number;
};

export function scoreToGrade(score: number) {
  if (score >= 75) {
    return "EE";
  }

  if (score >= 50) {
    return "ME";
  }

  if (score >= 25) {
    return "AE";
  }

  return "BE";
}

export function competitionRank<T extends RankedItem>(items: T[]) {
  let currentRank = 0;
  let lastScore: number | null = null;

  return items.map((item, index) => {
    if (lastScore === null || item.totalScore !== lastScore) {
      currentRank = index + 1;
      lastScore = item.totalScore;
    }

    return currentRank;
  });
}

export function generateRemark(averageScore: number) {
  if (averageScore >= 75) {
    return "Outstanding performance. Maintain the same discipline and focus.";
  }

  if (averageScore >= 50) {
    return "Good progress. Push a bit harder for excellent outcomes.";
  }

  if (averageScore >= 25) {
    return "Fair effort. More consistency and revision are needed.";
  }

  return "Needs significant support and closer follow-up.";
}

export function isOperationalStatus(status: StudentStatus) {
  return status === StudentStatus.ACTIVE || status === StudentStatus.PROMOTED;
}

export function filterTopByGender<T extends { gender: Gender }>(items: T[], gender: Gender, limit = 10) {
  return items.filter((item) => item.gender === gender).slice(0, limit);
}
