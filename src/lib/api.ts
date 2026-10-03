import { z } from "zod";
import {
  projectSchema,
  jobSchema,
  settingsSchema,
  workRecordSchema,
  type Project,
  type JobKind,
  type WorkRecordInput,
} from "./schema";
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok)
    throw new ApiError(
      json.error?.message || "请求失败",
      json.error?.code || "UNKNOWN",
      res.status,
    );
  return schema.parse(json);
}
const body = (data: unknown) => JSON.stringify(data);
export const api = {
  list: () => request("/projects", z.array(projectSchema)),
  get: (id: string) =>
    request(
      `/projects/${id}`,
      z.object({ project: projectSchema, job: jobSchema.nullable() }),
    ),
  create: (data: unknown) =>
    request("/projects", projectSchema, { method: "POST", body: body(data) }),
  save: (p: Project) =>
    request(`/projects/${p.id}`, projectSchema, {
      method: "PATCH",
      body: body(p),
    }),
  remove: (id: string) =>
    request(`/projects/${id}`, z.object({ ok: z.boolean() }), {
      method: "DELETE",
    }),
  job: (id: string, kind: JobKind, key: string) =>
    request(`/projects/${id}/jobs`, jobSchema, {
      method: "POST",
      body: body({ kind }),
      headers: { "Idempotency-Key": key },
    }),
  cancel: (id: string) =>
    request(`/jobs/${id}/cancel`, jobSchema, { method: "POST" }),
  upload: (id: string, form: FormData) =>
    request(`/projects/${id}/images`, projectSchema, {
      method: "POST",
      body: form,
    }),
  settings: () => request("/settings", settingsSchema),
  records: {
    list: () => request("/records", z.array(workRecordSchema)),
    get: (id: string) => request(`/records/${id}`, workRecordSchema),
    history: (id: string) =>
      request(`/records/${id}/history`, z.array(workRecordSchema)),
    create: (data: WorkRecordInput & { id: string }) =>
      request("/records", workRecordSchema, {
        method: "POST",
        body: body(data),
      }),
    save: (
      data: WorkRecordInput & {
        id: string;
        revision: number;
        reconfirmProjectRevision?: number;
      },
    ) =>
      request(`/records/${data.id}`, workRecordSchema, {
        method: "PATCH",
        body: body(data),
      }),
    remove: (id: string, revision: number) =>
      request(
        `/records/${id}?revision=${revision}`,
        z.object({ ok: z.boolean() }),
        {
          method: "DELETE",
        },
      ),
  },
};
