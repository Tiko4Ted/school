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
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [meritList, setMeritList] = useState<MeritListResponse | null>(null);
  const [isLoadingMerit, setIsLoadingMerit] = useState(false);
  const [streamFilter, setStreamFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    setIsLoadingOptions(true);
    const [setupResponse, examsResponse] = await Promise.all([
      fetch("/api/setup", { cache: "no-store" }),
      fetch("/api/exams", { cache: "no-store" }),
    ]);
    const setupPayload = await setupResponse.json();
    const examsPayload = await examsResponse.json();
    setClasses(setupPayload.data.classes ?? []);
    setExams(examsPayload.data ?? []);
    setIsLoadingOptions(false);
  }

  async function fetchMeritList() {
    if (!selectedClassId || !selectedExamId) return;
    setIsLoadingMerit(true);
    const response = await fetch(`/api/merit-lists?examId=${selectedExamId}&classId=${selectedClassId}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setMeritList(payload.data);
    setIsLoadingMerit(false);
  }

  const filteredEntries = useMemo(() => {
    if (!meritList) return [];
    return meritList.entries.filter((e) => {
      const matchesStream = streamFilter === "all" || e.stream.id === streamFilter;
      const searchTarget = `${e.student.admissionNumber} ${e.student.firstName} ${e.student.lastName}`.toLowerCase();
      return matchesStream && (search.trim() === "" || searchTarget.includes(search.toLowerCase()));
    });
  }, [meritList, streamFilter, search]);

  return (
    <div className="space-y-6 pb-20">
      <Card className="border-none shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <div className="flex-1 grid gap-4 sm:grid-cols-2">
              <FormField label="Target Class"><Select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="h-10 text-xs font-bold">{classes.slice().sort((a,b)=>a.level-b.level).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
              <FormField label="Exam Period"><Select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="h-10 text-xs font-bold">{exams.map(e=><option key={e.id} value={e.id}>{e.name} ({e.term.name})</option>)}</Select></FormField>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchMeritList} disabled={!selectedClassId || !selectedExamId || isLoadingMerit} className="h-10 px-6 font-bold uppercase text-[10px]">{isLoadingMerit ? "Loading..." : "Load Rankings"}</Button>
              <PrimaryButton onClick={() => {}} className="h-10 px-6 font-bold uppercase text-[10px]">Regenerate</PrimaryButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {meritList && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-soft overflow-hidden">
              <CardHeader className="bg-primary/5 py-3 border-b border-border-subtle"><CardTitle className="text-sm text-primary uppercase tracking-widest">Top Girls</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table><TableBody>
                  {meritList.topGirls.map((g, i) => (
                    <TableRow key={g.studentId} className="group"><TableCell className="w-10 text-center py-1.5"><span className="text-[10px] font-black">{i+1}</span></TableCell><TableCell className="py-1.5 font-bold text-[12px]">{g.studentName}</TableCell><TableCell className="py-1.5 text-right pr-6"><span className="text-[11px] font-black text-primary">{g.score.toFixed(2)}</span></TableCell></TableRow>
                  ))}
                </TableBody></Table>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft overflow-hidden">
              <CardHeader className="bg-secondary/5 py-3 border-b border-border-subtle"><CardTitle className="text-sm text-secondary uppercase tracking-widest">Top Boys</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table><TableBody>
                  {meritList.topBoys.map((b, i) => (
                    <TableRow key={b.studentId} className="group"><TableCell className="w-10 text-center py-1.5"><span className="text-[10px] font-black">{i+1}</span></TableCell><TableCell className="py-1.5 font-bold text-[12px]">{b.studentName}</TableCell><TableCell className="py-1.5 text-right pr-6"><span className="text-[11px] font-black text-secondary">{b.score.toFixed(2)}</span></TableCell></TableRow>
                  ))}
                </TableBody></Table>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-soft">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle py-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Full Merit List</h3>
                <span className="text-[9px] font-black bg-secondary-light/50 text-secondary px-2 py-0.5 rounded uppercase tracking-widest">Official</span>
              </div>
              <div className="flex gap-2">
                <Select value={streamFilter} onChange={e => setStreamFilter(e.target.value)} className="h-8 text-[10px] font-bold w-32"><option value="all">All Streams</option>{classes.find(c=>c.id===selectedClassId)?.streams.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 text-[10px] w-48" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-background/80">
                  <TableHead className="py-2 text-[10px] uppercase">Rank</TableHead>
                  <TableHead className="py-2 text-[10px] uppercase">Student</TableHead>
                  <TableHead className="py-2 text-[10px] uppercase text-right">Aggregate</TableHead>
                  <TableHead className="py-2 text-[10px] uppercase text-right">Mean</TableHead>
                  <TableHead className="py-2 text-[10px] uppercase text-right pr-8">VAP</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredEntries.map((e) => (
                    <TableRow key={e.id} className="hover:bg-primary-light/5 transition-colors">
                      <TableCell className="py-1.5"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${e.classRank <= 3 ? 'bg-accent text-white' : 'bg-background border border-border-subtle'}`}>{e.classRank}</span></TableCell>
                      <TableCell className="py-1.5"><p className="text-[12px] font-black text-text-primary">{e.student.firstName} {e.student.lastName}</p><span className="text-[9px] font-bold text-text-secondary/40 uppercase">{e.stream.name} · {e.student.admissionNumber}</span></TableCell>
                      <TableCell className="py-1.5 text-right font-black text-[12px]">{e.totalScore.toFixed(2)}</TableCell>
                      <TableCell className="py-1.5 text-right"><span className="text-[11px] font-black text-primary bg-primary-light/30 px-2 py-0.5 rounded">{e.averageScore.toFixed(2)}</span></TableCell>
                      <TableCell className="py-1.5 text-right pr-8">{e.improvement != null && <span className={`text-[10px] font-black ${e.improvement > 0 ? 'text-secondary' : 'text-error'}`}>{e.improvement > 0 ? '▲' : '▼'}{Math.abs(e.improvement).toFixed(2)}</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
