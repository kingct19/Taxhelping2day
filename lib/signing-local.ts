import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown>;
type TableName = "signing_templates" | "signing_packets";
type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "neq"; column: string; value: unknown }
  | { kind: "is"; column: string; value: unknown }
  | { kind: "in"; column: string; value: unknown[] };

type SigningFile = { templates: Row[]; packets: Row[] };

const dataDir = path.join(process.cwd(), "data");
const signingPath = path.join(dataDir, "signing.json");
const filesDir = path.join(dataDir, "portal-files");

let queue: Promise<unknown> = Promise.resolve();

function emptyFile(): SigningFile {
  return { templates: [], packets: [] };
}

async function readSigning(): Promise<SigningFile> {
  try {
    const parsed = JSON.parse(await readFile(signingPath, "utf8")) as Partial<SigningFile>;
    return { templates: parsed.templates ?? [], packets: parsed.packets ?? [] };
  } catch {
    return emptyFile();
  }
}

function withSigning<T>(mutate: boolean, fn: (file: SigningFile) => Promise<T> | T): Promise<T> {
  const run = queue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const file = await readSigning();
    const result = await fn(file);
    if (mutate) await writeFile(signingPath, JSON.stringify(file, null, 2));
    return result;
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}

function matches(row: Row, filters: Filter[]) {
  return filters.every((filter) => {
    const current = row[filter.column] ?? null;
    switch (filter.kind) {
      case "eq":
      case "is":
        return current === filter.value;
      case "neq":
        return current !== filter.value;
      case "in":
        return filter.value.includes(current);
      default: {
        const exhaustive: never = filter;
        return exhaustive;
      }
    }
  });
}

function project(row: Row, columns: string) {
  if (columns === "*" || columns.includes("tax_returns")) return { ...row };
  const picked: Row = {};
  for (const column of columns.split(",").map((item) => item.trim()).filter(Boolean)) picked[column] = row[column];
  return picked;
}

async function returnOwner(returnId: string) {
  try {
    const db = JSON.parse(await readFile(path.join(dataDir, "db.json"), "utf8")) as { returns?: { id: string; profileId: string }[] };
    return db.returns?.find((item) => item.id === returnId) ?? null;
  } catch {
    return null;
  }
}

class LocalQuery implements PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> {
  private filters: Filter[] = [];
  private columns = "*";
  private sort: { column: string; ascending: boolean } | null = null;
  private one: "single" | "maybe" | null = null;

  constructor(private table: TableName, private mode: "select" | "insert" | "update", private payload?: Row) {}

  select(columns = "*") {
    this.columns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ kind: "neq", column, value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ kind: "is", column, value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ kind: "in", column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sort = { column, ascending: options?.ascending !== false };
    return this;
  }

  single() {
    this.one = "single";
    return this;
  }

  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  then<TResult1 = { data: unknown; error: { code?: string; message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { code?: string; message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private rows(file: SigningFile) {
    return this.table === "signing_templates" ? file.templates : file.packets;
  }

  private async run() {
    return withSigning(this.mode !== "select", async (file) => {
      const rows = this.rows(file);
      if (this.mode === "insert" && this.payload) {
        if (this.payload.submission_id != null && rows.some((row) => row.submission_id === this.payload?.submission_id)) {
          return { data: null, error: { code: "23505", message: "Duplicate submission." } };
        }
        const now = new Date().toISOString();
        const row: Row = this.table === "signing_templates"
          ? { id: randomUUID(), name: "", docuseal_template_id: null, signer_role: "First Party", archived_at: null, created_at: now, updated_at: now, ...this.payload }
          : { id: randomUUID(), template_ref: null, submission_id: null, status: "creating", signer_states: [], files: [], sent_at: now, ...this.payload };
        rows.push(row);
        const data = this.one ? project(row, this.columns) : [project(row, this.columns)];
        return { data, error: null };
      }
      let found = rows.filter((row) => matches(row, this.filters));
      if (this.sort) {
        const { column, ascending } = this.sort;
        found = [...found].sort((a, b) => String(a[column] ?? "").localeCompare(String(b[column] ?? "")) * (ascending ? 1 : -1));
      }
      if (this.mode === "update" && this.payload) {
        for (const row of found) Object.assign(row, this.payload);
        return { data: null, error: null };
      }
      if (this.columns.includes("tax_returns")) {
        const withOwners = [];
        for (const row of found) {
          const owner = await returnOwner(String(row.return_id ?? ""));
          if (!owner) continue;
          withOwners.push({ ...project(row, this.columns), tax_returns: { profile_id: owner.profileId } });
        }
        found = withOwners;
      }
      const projected = found.map((row) => this.columns.includes("tax_returns") ? row : project(row, this.columns));
      if (this.one === "maybe") return { data: projected[0] ?? null, error: null };
      if (this.one === "single") {
        if (!projected[0]) return { data: null, error: { message: "No row." } };
        return { data: projected[0], error: null };
      }
      return { data: projected, error: null };
    });
  }
}

export function localPacketDb() {
  return {
    from(table: TableName) {
      return {
        select(columns?: string) {
          return new LocalQuery(table, "select").select(columns);
        },
        insert(payload: Row) {
          return new LocalQuery(table, "insert", payload);
        },
        update(payload: Row) {
          return new LocalQuery(table, "update", payload);
        },
      };
    },
    storage: {
      from() {
        return {
          async upload(filePath: string, bytes: Buffer, options?: { contentType?: string }) {
            const target = path.join(filesDir, filePath);
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, bytes);
            void options;
            return { error: null };
          },
          async download(filePath: string) {
            try {
              const bytes = await readFile(path.join(filesDir, filePath));
              return { data: new Blob([bytes]) };
            } catch {
              return { data: null };
            }
          },
        };
      },
    },
  };
}
