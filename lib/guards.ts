import { Role } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function requireApiUser() {
  const session = await getAuthSession();

  if (!session?.user) {
    throw new AppError("Unauthorized", 401);
  }

  return session.user;
}

export async function requireAdminUser() {
  const user = await requireApiUser();

  if (user.role !== Role.ADMIN) {
    throw new AppError("Forbidden", 403);
  }

  return user;
}

export async function requireTeacherProfile() {
  const user = await requireApiUser();

  if (user.role !== Role.TEACHER) {
    throw new AppError("Forbidden", 403);
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
  });

  if (!teacher) {
    throw new AppError("Teacher profile not found", 404);
  }

  return { user, teacher };
}
