"use client";

import { useEffect, useMemo, useState } from "react";
import { generateMeritListAction } from "@/app/admin/merit/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, PrimaryButton, ButtonLink } from "@/components/ui/button";
import { z } from "zod";

type SetupClass = {
  id: string;
  name: string;
  level: number;
  streams: { id: string; name: string }[];
};

type ExamOption = {
  id: string;
  name: string;
  startDate: string;
  term: { name: string };
  configurations: { classId: string; subjectId: string }[];
};

type MeritListResponse = {
  id: string;
  examId: string;
  classId: string;
  generatedAt: string;
  entries: Array<{
    id: string;
    classRank: number;
    streamRank: number;
    totalScore: number;
    averageScore: number;
    improvement: number | null;
    stream: { id: string; name: string };
    student: { id: string; admissionNumber: string; firstName: string; lastName: string };
  }>;
  subjectChampions: Array<{
    id: string;
    score: number;
    subject: { id: string; name: string; code: string };
    student: { id: string; admissionNumber: string; firstName: string; lastName: string };
  }>;
  exam: { name: string; term: { name: string } };
  class: { name: string };
  topGirls: Array<{ studentId: string; studentName: string; score: number }>;
  topBoys: Array<{ studentId: string; studentName: string; score: number }>;
};

export function MeritListsManager() {
  const [classes, setClasses] = useState<SetupClass[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const [meritList, setMeritList] = useState<MeritListResponse | null>(null);
  const [isLoadingMerit, setIsLoadingMerit] = useState(false);
  const [meritError, setMeritError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [streamFilter, setStreamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const selectionSchema = z.object({
    classId: z.string().uuid(),
    examId: z.string().uuid(),
  });

  const selectionPayload =
    selectedClassId && selectedExamId ? { classId: selectedClassId, examId: selectedExamId } : null;
  const selectionValidation = selectionPayload ? selectionSchema.safeParse(selectionPayload) : null;
  const selectionValid = Boolean(selectionValidation?.success);

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    setIsLoadingOptions(true);
    setOptionsError(null);
    try {
      const [setupResponse, examsResponse] = await Promise.all([
        fetch("/api/setup", { cache: "no-store" }),
        fetch("/api/exams", { cache: "no-store" }),
      ]);
      const setupPayload = (await setupResponse.json().catch(() => null)) as
        | { data?: { classes?: SetupClass[] }; error?: string }
        | null;
      const examsPayload = (await examsResponse.json().catch(() => null)) as
        | { data?: ExamOption[]; error?: string }
        | null;

      if (!setupResponse.ok) {
        setOptionsError(setupPayload?.error ?? "Failed to load classes.");
        setIsLoadingOptions(false);
        return;
      }
      if (!examsResponse.ok) {
        setOptionsError(examsPayload?.error ?? "Failed to load exams.");
        setIsLoadingOptions(false);
        return;
      }

      setClasses(setupPayload?.data?.classes ?? []);
      setExams(examsPayload?.data ?? []);
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : "Failed to load options.");
    } finally {
      setIsLoadingOptions(false);
    }
  }

  async function fetchMeritList() {
    if (!selectionValid || !selectionValidation?.success) {
      setSelectionError(selectionValidation?.error?.flatten().formErrors[0] ?? "Select class and exam first.");
      setMeritError("Select class and exam first.");
      return;
    }

    setIsLoadingMerit(true);
    setMeritError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/merit-lists?examId=${selectedExamId}&classId=${selectedClassId}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as { data?: MeritListResponse; error?: string } | null;

      if (!response.ok) {
        setMeritError(payload?.error ?? "Failed to load merit list.");
        return;
      }

      setMeritList(payload?.data ?? null);
    } catch (error) {
      setMeritError(error instanceof Error ? error.message : "Failed to load merit list.");
    } finally {
      setIsLoadingMerit(false);
    }
  }

  async function handleGenerate() {
    if (!selectionValid || !selectionValidation?.success) {
      setSelectionError(selectionValidation?.error?.flatten().formErrors[0] ?? "Select class and exam first.");
      setMeritError("Select class and exam first.");
      return;
    }
    const result = await generateMeritListAction(selectionValidation.data);
    if (!result.success) {
      setMeritError(result.error ?? "Failed to generate merit list.");
      return;
    }
    setSuccessMessage("Merit list generated successfully.");
    await fetchMeritList();
  }

  const currentClass = classes.find((cls) => cls.id === selectedClassId);
  const filteredEntries = useMemo(() => {
    if (!meritList) {
      return [];
    }
    return meritList.entries.filter((entry) => {
      const matchesStream = streamFilter === "all" || entry.stream.id === streamFilter;
      const searchTarget = `${entry.student.admissionNumber} ${entry.student.firstName} ${entry.student.lastName}`.toLowerCase();
      const matchesSearch = search.trim().length === 0 || searchTarget.includes(search.trim().toLowerCase());
      return matchesStream && matchesSearch;
    });
  }, [meritList, streamFilter, search]);

  const pdfLink =
    selectionValid && selectionValidation?.success
      ? `/api/merit-lists?examId=${selectionValidation.data.examId}&classId=${selectionValidation.data.classId}&format=pdf`
      : null;

  const streamOptions = currentClass?.streams ?? [];

  return (
    <div className="space-y-10">
      {/* Search & Filter Header */}
      <Card className="border-none shadow-soft overflow-visible">
        <CardContent className="p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-text-primary dark:text-text-primary-dark mb-1">Merit & Rankings</h2>
              <p className="text-text-secondary dark:text-text-secondary-dark text-sm mb-6">Select parameters to view or generate competition rankings.</p>
              
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                <FormField label="Class Selection">
                  <Select
                    value={selectedClassId}
                    onChange={(event) => {
                      setSelectedClassId(event.target.value);
                      setMeritList(null);
                      setMeritError(null);
                      setSelectionError(null);
                    }}
                    className="h-11"
                  >
                    <option value="">Choose a class...</option>
                    {classes
                      .slice()
                      .sort((a, b) => a.level - b.level)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                  </Select>
                </FormField>

                <FormField label="Exam Period">
                  <Select
                    value={selectedExamId}
                    onChange={(event) => {
                      setSelectedExamId(event.target.value);
                      setMeritList(null);
                      setMeritError(null);
                      setSelectionError(null);
                    }}
                    className="h-11"
                  >
                    <option value="">Choose an exam...</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.term.name})
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:pb-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => void fetchMeritList()}
                disabled={!selectionValid || isLoadingMerit}
                className="h-11 px-6 font-bold uppercase tracking-wider text-xs"
              >
                {isLoadingMerit ? "Loading..." : "View Rankings"}
              </Button>
              <PrimaryButton
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!selectionValid}
                className="h-11 px-6 font-bold uppercase tracking-wider text-xs"
              >
                Generate Fresh
              </PrimaryButton>
              {pdfLink && (
                <ButtonLink href={pdfLink} variant="outline" className="h-11 px-6 font-bold uppercase tracking-wider text-xs border-secondary text-secondary hover:bg-secondary-light/30">
                  Export PDF
                </ButtonLink>
              )}
            </div>
          </div>

          {(meritError || selectionError) && (
            <div className="mt-6 rounded-xl border border-error/20 bg-error/5 p-4 text-sm font-medium text-error">
              {meritError || selectionError}
            </div>
          )}
          {successMessage && (
            <div className="mt-6 rounded-xl border border-secondary/20 bg-secondary-light/30 p-4 text-sm font-medium text-secondary">
              {successMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {meritList ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top Gender Performers */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-soft overflow-hidden">
              <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b border-border-subtle dark:border-border-dark py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-primary flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    Top Girls
                  </CardTitle>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Top 5</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {meritList.topGirls.length ? (
                      meritList.topGirls.map((girl, idx) => (
                        <TableRow key={girl.studentId} className="group">
                          <TableCell className="w-12 text-center">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${idx === 0 ? "bg-accent text-white" : "bg-primary-light/50 text-primary"}`}>
                              {idx + 1}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-text-primary dark:text-text-primary-dark group-hover:text-primary transition-colors">{girl.studentName}</TableCell>
                          <TableCell className="text-right">
                            <span className="rounded-lg bg-background dark:bg-background-dark px-2.5 py-1 text-sm font-black text-primary border border-border-subtle dark:border-border-dark">
                              {girl.score.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="py-12 text-center text-text-secondary italic">No data recorded</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-none shadow-soft overflow-hidden">
              <CardHeader className="bg-secondary/5 dark:bg-secondary/10 border-b border-border-subtle dark:border-border-dark py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-secondary flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                    Top Boys
                  </CardTitle>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">Top 5</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {meritList.topBoys.length ? (
                      meritList.topBoys.map((boy, idx) => (
                        <TableRow key={boy.studentId} className="group">
                          <TableCell className="w-12 text-center">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${idx === 0 ? "bg-accent text-white" : "bg-secondary-light/50 text-secondary"}`}>
                              {idx + 1}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-text-primary dark:text-text-primary-dark group-hover:text-secondary transition-colors">{boy.studentName}</TableCell>
                          <TableCell className="text-right">
                            <span className="rounded-lg bg-background dark:bg-background-dark px-2.5 py-1 text-sm font-black text-secondary border border-border-subtle dark:border-border-dark">
                              {boy.score.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="py-12 text-center text-text-secondary italic">No data recorded</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Subject Champions */}
          <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="border-b border-border-subtle dark:border-border-dark bg-background/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-accent-light/50 text-accent">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div>
                  <CardTitle className="text-xl">Subject Champions</CardTitle>
                  <CardDescription>Best performers per subject in {meritList.class.name}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/80 dark:bg-background-dark/80">
                    <TableHead className="py-4">Subject</TableHead>
                    <TableHead className="py-4">Student Identity</TableHead>
                    <TableHead className="py-4 text-right">Champion Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meritList.subjectChampions.map((champion) => (
                    <TableRow key={champion.id} className="hover:bg-primary-light/5 transition-colors">
                      <TableCell className="font-black text-primary dark:text-primary-light py-5">
                        <span className="bg-primary-light/20 px-3 py-1.5 rounded-xl border border-primary-light/30">
                          {champion.subject.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 flex items-center justify-center rounded-full bg-background dark:bg-background-dark border border-border-subtle dark:border-border-dark text-[10px] font-bold text-text-secondary">
                            {champion.student.admissionNumber}
                          </div>
                          <span className="font-extrabold text-text-primary dark:text-text-primary-dark">
                            {champion.student.firstName} {champion.student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-5">
                        <span className="text-xl font-black text-accent tracking-tighter">
                          {Number(champion.score).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {meritList.subjectChampions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-20 text-center text-text-secondary italic">
                        Processing subject data...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detailed Merit Table */}
          <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-border-subtle dark:border-border-dark bg-background/50 p-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black tracking-tight text-text-primary dark:text-text-primary-dark">{meritList.class.name} Full Ranking</h3>
                  <span className="bg-secondary/10 text-secondary text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-secondary/20 tracking-widest">Official</span>
                </div>
                <CardDescription className="flex items-center gap-4">
                  <span>Entries: <strong className="text-text-primary dark:text-text-primary-dark">{meritList.entries.length}</strong></span>
                  <span className="h-1 w-1 rounded-full bg-border-subtle"></span>
                  <span>Exam: <strong className="text-text-primary dark:text-text-primary-dark">{meritList.exam.name}</strong></span>
                </CardDescription>
              </div>
              
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="w-full sm:w-48">
                  <Select
                    value={streamFilter}
                    onChange={(event) => setStreamFilter(event.target.value)}
                    className="h-10 text-xs font-bold"
                  >
                    <option value="all">All streams</option>
                    {streamOptions.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name} Stream
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-full sm:w-64">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or admission..."
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/80 dark:bg-background-dark/80">
                    <TableHead className="py-4">Rank</TableHead>
                    <TableHead className="py-4">Stream</TableHead>
                    <TableHead className="py-4">Student Information</TableHead>
                    <TableHead className="py-4 text-right">Aggregate</TableHead>
                    <TableHead className="py-4 text-right">Mean Score</TableHead>
                    <TableHead className="py-4 text-right">VAP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry, idx) => (
                    <TableRow key={entry.id} className={`${idx < 3 ? "bg-primary-light/5 dark:bg-primary-light/5" : ""} group transition-colors`}>
                      <TableCell className="py-6">
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-black shadow-soft transition-transform group-hover:scale-110 ${
                            entry.classRank === 1 ? "bg-accent text-white rotate-12" : 
                            entry.classRank === 2 ? "bg-text-secondary text-white" :
                            entry.classRank === 3 ? "bg-accent/70 text-white" :
                            "bg-primary-light/30 text-primary"
                          }`}>
                            {entry.classRank}
                          </span>
                          <span className="text-[10px] font-bold text-text-secondary/60">Pos {entry.streamRank}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-secondary group-hover:text-primary transition-colors">
                          {entry.stream.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-text-primary dark:text-text-primary-dark leading-tight group-hover:underline decoration-primary decoration-2 underline-offset-4">
                            {entry.student.firstName} {entry.student.lastName}
                          </span>
                          <span className="text-xs font-bold text-text-secondary/80 mt-1 uppercase tracking-tighter">ADM: {entry.student.admissionNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-6">
                        <span className="text-lg font-black text-text-primary dark:text-text-primary-dark tracking-tighter">
                          {entry.totalScore.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-6">
                        <span className="text-sm font-bold text-primary px-2.5 py-1 rounded-lg bg-primary-light/20 border border-primary-light/30">
                          {entry.averageScore.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-6">
                        {entry.improvement == null ? (
                          <span className="text-text-secondary/40 text-xs">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border ${
                            entry.improvement > 0 ? "text-secondary border-secondary/20 bg-secondary-light/30" : 
                            entry.improvement < 0 ? "text-error border-error/20 bg-error/10" : 
                            "text-text-secondary border-border-subtle bg-background"
                          }`}>
                            {entry.improvement > 0 ? "▲" : entry.improvement < 0 ? "▼" : "•"}
                            {Math.abs(entry.improvement).toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-32 text-center">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-background dark:bg-background-dark border border-border-subtle dark:border-border-dark flex items-center justify-center text-text-secondary mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                          </div>
                          <p className="text-text-secondary font-bold">No results match your criteria</p>
                          <p className="text-xs text-text-secondary/60 mt-1">Try adjusting your filters or search terms</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="flex justify-center pb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">
              End of Merit List • SchoolMS Digital Report
            </p>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
           <div className="h-24 w-24 rounded-3xl bg-background dark:bg-background-dark border-2 border-dashed border-border-subtle dark:border-border-dark flex items-center justify-center text-text-secondary/20 mb-6">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
           </div>
           <h3 className="text-xl font-bold text-text-secondary">Ready to View Rankings</h3>
           <p className="text-sm text-text-secondary/60 max-w-xs mt-2">
             Select a class and exam above to load the performance rankings and subject champions.
           </p>
        </div>
      )}
    </div>
  );
}
