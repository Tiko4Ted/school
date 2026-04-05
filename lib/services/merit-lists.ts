import { Gender, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { competitionRank, filterTopByGender } from "@/lib/grading";

type MeritEntry = {
  studentId: string;
  streamId: string;
  gender: Gender;
  totalScore: number;
  averageScore: number;
  classRank: number;
  streamRank: number;
  improvement?: number;
};

export type MeritComputationInput = {
  studentId: string;
  streamId: string;
  gender: Gender;
  totalScore: number;
  subjectCount: number;
  previousAverage?: number;
};

export function buildMeritEntries(input: MeritComputationInput[]): MeritEntry[] {
  if (input.length === 0) {
    return [];
  }

  const ordered = input
    .map((entry) => {
      if (entry.subjectCount <= 0) {
        throw new AppError("Merit entry has no subjects to average", 500);
      }

      const totalScore = Number(entry.totalScore.toFixed(2));
      const averageScore = Number((totalScore / entry.subjectCount).toFixed(2));
      const improvement =
        entry.previousAverage == null ? undefined : Number((averageScore - entry.previousAverage).toFixed(2));

      return {
        studentId: entry.studentId,
        streamId: entry.streamId,
        gender: entry.gender,
        totalScore,
        averageScore,
        improvement,
      };
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      return a.studentId.localeCompare(b.studentId);
    });

  const classRanks = competitionRank(ordered);

  const streamRanksByStudent = new Map<string, number>();
  const byStream = new Map<string, typeof ordered>();

  for (const entry of ordered) {
    const items = byStream.get(entry.streamId) ?? [];
    items.push(entry);
    byStream.set(entry.streamId, items);
  }

  for (const items of byStream.values()) {
    const ranks = competitionRank(items);
    items.forEach((item, index) => {
      streamRanksByStudent.set(item.studentId, ranks[index]!);
    });
  }

  return ordered.map((entry, index) => ({
    ...entry,
    classRank: classRanks[index]!,
    streamRank: streamRanksByStudent.get(entry.studentId)!,
  }));
}

export async function generateMeritList(examId: string, classId: string) {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: { term: true },
  });

  if (!exam) {
    throw new AppError("Exam not found", 404);
  }

  const marks = await db.mark.findMany({
    where: {
      examId,
      student: {
        currentClassId: classId,
      },
    },
    include: {
      student: true,
      subject: true,
    },
  });

  if (marks.length === 0) {
    throw new AppError("No marks found for the selected exam and class", 404);
  }

  const grouped = new Map<
    string,
    {
      studentId: string;
      streamId: string;
      gender: Gender;
      totalScore: number;
      count: number;
    }
  >();

  for (const mark of marks) {
    const current = grouped.get(mark.studentId) ?? {
      studentId: mark.studentId,
      streamId: mark.streamId,
      gender: mark.student.gender,
      totalScore: 0,
      count: 0,
    };

    current.totalScore += Number(mark.score);
    current.count += 1;
    grouped.set(mark.studentId, current);
  }

  const previousExam = await db.exam.findFirst({
    where: {
      term: {
        academicYearId: exam.term.academicYearId,
      },
      startDate: {
        lt: exam.startDate,
      },
    },
    orderBy: { startDate: "desc" },
  });

  const previousMarks = previousExam
    ? await db.mark.findMany({
        where: {
          examId: previousExam.id,
          student: {
            currentClassId: classId,
          },
        },
      })
    : [];

  const previousTotals = new Map<string, { total: number; count: number }>();
  for (const mark of previousMarks) {
    const current = previousTotals.get(mark.studentId) ?? { total: 0, count: 0 };
    current.total += Number(mark.score);
    current.count += 1;
    previousTotals.set(mark.studentId, current);
  }

  const computationInput = Array.from(grouped.values()).map((entry) => {
    const previous = previousTotals.get(entry.studentId);
    const previousAverage = previous ? Number((previous.total / previous.count).toFixed(2)) : undefined;

    return {
      studentId: entry.studentId,
      streamId: entry.streamId,
      gender: entry.gender,
      totalScore: entry.totalScore,
      subjectCount: entry.count,
      previousAverage,
    };
  });

  const entries = buildMeritEntries(computationInput);

  const subjectChampionsMap = new Map<string, { studentId: string; score: number }>();
  for (const mark of marks) {
    const current = subjectChampionsMap.get(mark.subjectId);
    const score = Number(mark.score);
    if (!current || score > current.score || (score === current.score && mark.studentId.localeCompare(current.studentId) < 0)) {
      subjectChampionsMap.set(mark.subjectId, { studentId: mark.studentId, score });
    }
  }

  return db.$transaction(async (tx) => {
    const meritList = await tx.meritList.upsert({
      where: {
        examId_classId: {
          examId,
          classId,
        },
      },
      update: {
        generatedAt: new Date(),
      },
      create: {
        examId,
        classId,
      },
    });

    await tx.meritListEntry.deleteMany({ where: { meritListId: meritList.id } });
    await tx.meritListSubjectChampion.deleteMany({ where: { meritListId: meritList.id } });

    await tx.meritListEntry.createMany({
      data: entries.map((entry) => ({
        meritListId: meritList.id,
        studentId: entry.studentId,
        streamId: entry.streamId,
        totalScore: entry.totalScore,
        averageScore: entry.averageScore,
        classRank: entry.classRank,
        streamRank: entry.streamRank,
        improvement: entry.improvement ?? null,
      })),
    });

    await tx.meritListSubjectChampion.createMany({
      data: Array.from(subjectChampionsMap.entries()).map(([subjectId, champion]) => ({
        meritListId: meritList.id,
        subjectId,
        studentId: champion.studentId,
        score: champion.score,
      })),
    });

    const saved = await tx.meritList.findUniqueOrThrow({
      where: { id: meritList.id },
      include: {
        entries: {
          include: {
            student: true,
            stream: true,
          },
          orderBy: { classRank: "asc" },
        },
        subjectChampions: {
          include: {
            subject: true,
            student: true,
          },
        },
        exam: true,
        class: true,
      },
    });

    return shapeMeritList(saved);
  });
}

export async function getMeritList(examId: string, classId: string) {
  const meritList = await db.meritList.findUnique({
    where: {
      examId_classId: {
        examId,
        classId,
      },
    },
    include: {
      entries: {
        include: {
          student: true,
          stream: true,
        },
        orderBy: { classRank: "asc" },
      },
      subjectChampions: {
        include: {
          subject: true,
          student: true,
        },
      },
      exam: true,
      class: true,
    },
  });

  if (!meritList) {
    throw new AppError("Merit list not found", 404);
  }

  return shapeMeritList(meritList);
}

function shapeMeritList(
  meritList: Prisma.MeritListGetPayload<{
    include: {
      entries: { include: { student: true; stream: true } };
      subjectChampions: { include: { subject: true; student: true } };
      exam: true;
      class: true;
    };
  }>,
) {
  const mappedEntries = meritList.entries.map(mapEntry);
  const topGirlsRaw = filterTopByGender(mappedEntries, Gender.FEMALE);
  const topBoysRaw = filterTopByGender(mappedEntries, Gender.MALE);
  return {
    ...meritList,
    entries: mappedEntries,
    subjectChampions: meritList.subjectChampions.map((champion) => ({
      ...champion,
      score: Number(champion.score),
    })),
    topGirls: topGirlsRaw.map((entry) => ({
      studentId: entry.studentId,
      studentName: `${entry.student.firstName} ${entry.student.lastName}`,
      score: entry.totalScore,
    })),
    topBoys: topBoysRaw.map((entry) => ({
      studentId: entry.studentId,
      studentName: `${entry.student.firstName} ${entry.student.lastName}`,
      score: entry.totalScore,
    })),
  };
}

function mapEntry(
  entry: Prisma.MeritListEntryGetPayload<{
    include: {
      student: true;
      stream: true;
    };
  }>,
) {
  return {
    ...entry,
    gender: entry.student.gender,
    totalScore: Number(entry.totalScore),
    averageScore: Number(entry.averageScore),
    improvement: entry.improvement == null ? null : Number(entry.improvement),
  };
}
