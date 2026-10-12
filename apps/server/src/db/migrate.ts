// 아직 적용하지 않은 마이그레이션 SQL 파일을 이름 순서대로 실행한다.
import { readdir, readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { loadEnv } from '../config/env';

const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);

// 연결 거부는 메시지가 비어 있어 에러 코드로 알아본다.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  if ((error as { code?: unknown }).code === 'ECONNREFUSED') {
    return 'DB에 연결하지 못했습니다. docker compose up -d로 DB가 떠 있는지 확인하세요';
  }
  return error.message || error.name;
}

const env = loadEnv();
const client = new Client({ connectionString: env.dbUrl });

try {
  await client.connect();

  // 적용한 파일 이름을 기록해 두어, 다시 실행해도 같은 파일을 두 번 적용하지 않는다.
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const { rows } = await client.query<{ name: string }>('select name from schema_migrations');
  const applied = new Set(rows.map((row) => row.name));

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();
  let appliedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip  ${file}`);
      continue;
    }

    const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
    // 파일 하나를 트랜잭션 하나로 실행한다. 중간에 실패하면 그 파일은 전부 취소된다.
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw new Error(`${file}: ${describeError(error)}`);
    }

    console.log(`[migrate] apply ${file}`);
    appliedCount += 1;
  }

  console.log(`[migrate] done - 새로 적용 ${appliedCount}개, 전체 ${files.length}개`);
} catch (error) {
  console.error(`[migrate] 실패: ${describeError(error)}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
