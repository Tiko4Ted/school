"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button, PrimaryButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ExamRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  term: {
    id: string;
    name: string;
    academicYear: { id: string; name: string };
  };
  configurations: {
    id: string;
    class: { id: string; name: string };
    subject: { id: string; name: string; code: string };
  }[];
};

type SetupClass = {
  id: string;
  name: string;
  level: number;
  classSubjects: {
    id: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  }[];
};

type SetupResponse = {
  classes: SetupClass[];
  academicYears: {
    id: string;
    name: string;
    terms: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }[];
  }[];
};

type ExamConfigRow = {
  subject: { id: string };
};

const examFormSchema = z
  .object({
    termId: z.string().uuid("Select a term."),
    name: z.string().trim().min(2, "Exam name is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: "End date must be on or after start date.", path: ["endDate"] },
  );

const configurationSchema = z.object({
  classId: z.string().uuid("Select a class."),
  subjectIds: z.array(z.string().uuid()).min(1, "Select at least one subject."),
});

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function ExamsManager() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupResponse>({ classes: [], academicYears: [] });
  const [setupError, setSetupError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examValues, setExamValues] = useState({
    termId: "",
    name: "",
    startDate: "",
    endDate: "",
  });
  const [examFieldErrors, setExamFieldErrors] = useState<Record<string, string>>({});
  const [examFormError, setExamFormError] = useState<string | null>(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  const [configurationExamId, setConfigurationExamId] = useState("");
  const [configurationClassId, setConfigurationClassId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [configurationSuccess, setConfigurationSuccess] = useState<string | null>(null);
  const [isLoadingConfiguration, setIsLoadingConfiguration] = useState(false);
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);

  useEffect(() => {
    void loadExams();
    void loadSetupData();
  }, []);

  async function loadExams() {
    setIsLoadingExams(true);
    setExamsError(null);
    const response = await fetch("/api/exams", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ExamRecord[]; error?: string } | null;

    if (!response.ok) {
      setExamsError(payload?.error ?? "Failed to load exams.");
      setIsLoadingExams(false);
      return;
    }

    setExams(payload?.data ?? []);
    setIsLoadingExams(false);
  }

  async function loadSetupData() {
    const response = await fetch("/api/setup", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: SetupResponse; error?: string } | null;

    if (!response.ok) {
      setSetupError(payload?.error ?? "Failed to load setup data.");
      return;
    }

    setSetup({
      classes: payload?.data?.classes ?? [],
      academicYears: payload?.data?.academicYears ?? [],
    });
  }

  const termOptions = useMemo(() => {
    return setup.academicYears.flatMap((year) =>
      year.terms.map((term) => ({
        id: term.id,
        label: `${year.name} · ${term.name}`,
      })),
    );
  }, [setup.academicYears]);

  const sortedClasses = useMemo(() => {
    return [...setup.classes].sort((a, b) => a.level - b.level);
  }, [setup.classes]);

  function resetExamForm() {
    setFormMode("create");
    setEditingExamId(null);
    setExamValues({
      termId: "",
      name: "",
      startDate: "",
      endDate: "",
    });
    setExamFieldErrors({});
    setExamFormError(null);
  }

  function handleEditExam(exam: ExamRecord) {
    setFormMode("edit");
    setEditingExamId(exam.id);
    setExamValues({
      termId: exam.term.id,
      name: exam.name,
      startDate: formatDate(exam.startDate),
      endDate: formatDate(exam.endDate),
    });
    setExamFieldErrors({});
    setExamFormError(null);
  }

  async function handleExamSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingExam(true);
    setExamFormError(null);
    setExamFieldErrors({});

    const parsed = examFormSchema.safeParse(examValues);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setExamFieldErrors({
        termId: fieldErrors.termId?.[0] ?? "",
        name: fieldErrors.name?.[0] ?? "",
        startDate: fieldErrors.startDate?.[0] ?? "",
        endDate: fieldErrors.endDate?.[0] ?? "",
      });
      setIsSubmittingExam(false);
      return;
    }

    const endpoint = formMode === "create" ? "/api/exams" : `/api/exams/${editingExamId}`;
    const method = formMode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setExamFormError(payload?.error ?? "Failed to save exam.");
      setIsSubmittingExam(false);
      return;
    }

    await loadExams();
    resetExamForm();
    setIsSubmittingExam(false);
  }

  function handleSubjectToggle(subjectId: string) {
    setSelectedSubjectIds((current) =>
      current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId],
    );
  }

  async function handleLoadConfiguration(examId: string, classId: string) {
    if (!examId || !classId) {
      setSelectedSubjectIds([]);
      return;
    }

    setIsLoadingConfiguration(true);
    setConfigurationError(null);
    const response = await fetch(`/api/exams/${examId}/configurations?classId=${classId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ExamConfigRow[]; error?: string } | null;

    if (!response.ok) {
      setConfigurationError(payload?.error ?? "Failed to load configuration.");
      setIsLoadingConfiguration(false);
      return;
    }

    setSelectedSubjectIds((payload?.data ?? []).map((item) => item.subject.id));
    setIsLoadingConfiguration(false);
  }

  async function handleConfigurationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configurationExamId || !configurationClassId) {
      setConfigurationError("Select an exam and class before configuring subjects.");
      return;
    }

    setIsSavingConfiguration(true);
    setConfigurationError(null);
    setConfigurationSuccess(null);

    const parsed = configurationSchema.safeParse({
      classId: configurationClassId,
      subjectIds: selectedSubjectIds,
    });

    if (!parsed.success) {
      const errorMessage = parsed.error.flatten().formErrors[0] ?? parsed.error.flatten().fieldErrors.subjectIds?.[0];
      setConfigurationError(errorMessage ?? "Invalid configuration.");
      setIsSavingConfiguration(false);
      return;
    }

    const response = await fetch(`/api/exams/${configurationExamId}/configurations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setConfigurationError(payload?.error ?? "Failed to save configuration.");
      setIsSavingConfiguration(false);
      return;
    }

    setConfigurationSuccess("Subjects saved for this class.");
    await loadExams();
    await handleLoadConfiguration(configurationExamId, configurationClassId);
    setIsSavingConfiguration(false);
  }

  useEffect(() => {
    if (configurationExamId && configurationClassId) {
      void handleLoadConfiguration(configurationExamId, configurationClassId);
    } else {
      setSelectedSubjectIds([]);
    }
  }, [configurationExamId, configurationClassId]);

  const selectedClassSubjects = useMemo(() => {
    return setup.classes.find((cls) => cls.id === configurationClassId)?.classSubjects ?? [];
  }, [configurationClassId, setup.classes]);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle>Exam Schedule</CardTitle>
            <CardDescription>
              Review all exams, linked terms, and class-subject scopes before marks entry opens.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadExams()}
          >
            Refresh list
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingExams ? (
            <p className="py-8 text-center text-sm text-text-secondary">Loading exams...</p>
          ) : examsError ? (
            <p className="py-8 text-center text-sm text-error">{examsError}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Configurations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => {
                  const classGroups = exam.configurations.reduce<Record<string, { className: string; subjects: string[] }>>(
                    (acc, config) => {
                      const key = config.class.id;
                      if (!acc[key]) {
                        acc[key] = { className: config.class.name, subjects: [] };
                      }
                      acc[key].subjects.push(config.subject.name);
                      return acc;
                    },
                    {},
                  );
                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-semibold text-text-primary">{exam.name}</TableCell>
                      <TableCell>
                        {exam.term.academicYear.name} · {exam.term.name}
                      </TableCell>
                      <TableCell>
                        {formatDate(exam.startDate)}{" "}
                        {exam.endDate ? (
                          <>
                            – {formatDate(exam.endDate)}
                          </>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {Object.keys(classGroups).length === 0 ? (
                          <span className="text-text-secondary italic">Not configured</span>
                        ) : (
                          <ul className="space-y-1">
                            {Object.values(classGroups).map((group) => (
                              <li key={group.className}>
                                <span className="font-semibold text-text-primary">{group.className}:</span> {group.subjects.join(", ")}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEditExam(exam)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {exams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-text-secondary">
                      No exams found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{formMode === "create" ? "New Exam" : "Update Exam Details"}</CardTitle>
            <CardDescription>
              Link exams to academic terms and keep timelines accurate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleExamSubmit}>
              <FormField label="Term" error={examFieldErrors.termId}>
                <Select
                  id="exam-term"
                  value={examValues.termId}
                  onChange={(event) => setExamValues((current) => ({ ...current, termId: event.target.value }))}
                >
                  <option value="">Select term</option>
                  {termOptions.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Name" error={examFieldErrors.name}>
                <Input
                  id="exam-name"
                  value={examValues.name}
                  onChange={(event) => setExamValues((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g., End of Term 1"
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Start Date" error={examFieldErrors.startDate}>
                  <Input
                    id="exam-start"
                    type="date"
                    value={examValues.startDate}
                    onChange={(event) => setExamValues((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </FormField>
                <FormField label="End Date (Optional)" error={examFieldErrors.endDate}>
                  <Input
                    id="exam-end"
                    type="date"
                    value={examValues.endDate}
                    onChange={(event) => setExamValues((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </FormField>
              </div>

              {examFormError ? (
                <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">{examFormError}</div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <PrimaryButton type="submit" disabled={isSubmittingExam}>
                  {isSubmittingExam ? "Saving..." : formMode === "create" ? "Create Exam" : "Save Changes"}
                </PrimaryButton>
                {formMode === "edit" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetExamForm}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Subject Scope</CardTitle>
            <CardDescription>
              Align each exam with the exact class/subject mix allowed for marks entry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleConfigurationSubmit}>
              <FormField label="Exam">
                <Select
                  id="config-exam"
                  value={configurationExamId}
                  onChange={(event) => {
                    setConfigurationExamId(event.target.value);
                    setConfigurationSuccess(null);
                  }}
                >
                  <option value="">Select exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.term.academicYear.name} · {exam.term.name})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Class">
                <Select
                  id="config-class"
                  value={configurationClassId}
                  onChange={(event) => {
                    setConfigurationClassId(event.target.value);
                    setConfigurationSuccess(null);
                  }}
                  disabled={!configurationExamId}
                >
                  <option value="">Select class</option>
                  {sortedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              {isLoadingConfiguration ? (
                <p className="text-sm text-text-secondary animate-pulse">Loading configuration...</p>
              ) : null}

              <div className="space-y-3">
                <p className="text-sm font-semibold text-text-primary">Subjects</p>
                {selectedClassSubjects.length === 0 ? (
                  <p className="text-sm text-text-secondary italic">Select a class to view its mapped subjects.</p>
                ) : (
                  <div className="grid gap-2">
                    {selectedClassSubjects.map((item) => (
                      <label
                        key={item.subject.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-subtle bg-background/50 px-4 py-2.5 text-sm text-text-primary transition hover:bg-primary-light/10"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
                          checked={selectedSubjectIds.includes(item.subject.id)}
                          onChange={() => handleSubjectToggle(item.subject.id)}
                        />
                        <span>{item.subject.name} ({item.subject.code})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {configurationError ? (
                <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">{configurationError}</div>
              ) : null}

              {configurationSuccess ? (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">
                  {configurationSuccess}
                </div>
              ) : null}

              <div className="pt-2">
                <PrimaryButton
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={!configurationExamId || !configurationClassId || isSavingConfiguration}
                >
                  {isSavingConfiguration ? "Saving..." : "Save Configuration"}
                </PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {setupError ? (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-warning-dark">{setupError}</div>
      ) : null}
    </div>
  );
}
