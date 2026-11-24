import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("official monitor Cron gates HTTP in Postgres without changing other jobs or settings", async () => {
  const db = new PGlite();
  try {
    // pg_cron and pg_net are replaced locally; the actual operational SQL and
    // its stored job command execute against Postgres, with no network access.
    await db.exec(`
      create schema cron; create schema vault; create schema net;
      create table cron.job (
        jobid bigint generated always as identity primary key,
        jobname text, schedule text, command text, username text default current_user,
        active boolean default true, unique(jobname, username)
      );
      create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint
      language sql as $$
        insert into cron.job(jobname,schedule,command) values(p_name,p_schedule,p_command)
        on conflict(jobname,username) do update set schedule=excluded.schedule,command=excluded.command
        returning jobid;
      $$;
      create table vault.decrypted_secrets(name text primary key, decrypted_secret text);
      insert into vault.decrypted_secrets values
        ('harmony_palette_site_url','https://example.test/'),
        ('harmony_palette_cron_secret','local-test-secret');
      create table public.official_monitor_settings(id boolean primary key, enabled boolean, next_run_at timestamptz);
      insert into public.official_monitor_settings values(true,true,now()+interval '1 hour');
      create table net.requests(id bigint generated always as identity, url text, headers jsonb, body jsonb, timeout_milliseconds integer);
      create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer) returns bigint
      language sql volatile as $$
        insert into net.requests(url,headers,body,timeout_milliseconds)
        values(url,headers,body,timeout_milliseconds) returning id;
      $$;
      select cron.schedule('harmony-palette-official-update-monitor','*/15 * * * *','old unconditional command');
      select cron.schedule('harmony-palette-instagram-dm','* * * * *','DM unchanged');
      select cron.schedule('harmony-palette-crowd-forecast','0 10 * * *','weather unchanged');
    `);
    const operation = await readFile(new URL("../../supabase/operations/ensure-official-monitor-cron.sql", import.meta.url), "utf8");
    const beforeJobs = (await db.query("select * from cron.job order by jobid")).rows;
    const beforeSettings = (await db.query("select * from public.official_monitor_settings")).rows;
    await db.exec(operation);
    await db.exec(operation);
    const jobs = (await db.query<{ jobid: number; jobname: string; schedule: string; command: string }>("select * from cron.job order by jobid")).rows;
    assert.equal(jobs.length, 3);
    assert.equal(jobs[0].jobid, beforeJobs[0].jobid);
    assert.equal(jobs[0].schedule, "*/15 * * * *");
    assert.deepEqual(jobs.slice(1), beforeJobs.slice(1));
    assert.deepEqual((await db.query("select * from public.official_monitor_settings")).rows, beforeSettings);
    const dispatch = async () => {
      await db.exec("truncate net.requests");
      await db.exec(jobs[0].command);
      return (await db.query<{ url: string; headers: { Authorization: string }; timeout_milliseconds: number }>("select * from net.requests")).rows;
    };
    assert.equal((await dispatch()).length, 0, "a future run must not enqueue HTTP");
    await db.exec("update public.official_monitor_settings set next_run_at=now()-interval '1 minute',enabled=false");
    assert.equal((await dispatch()).length, 0, "disabled monitoring must not enqueue HTTP");
    await db.exec("update public.official_monitor_settings set enabled=true");
    const due = await dispatch();
    assert.equal(due.length, 1);
    assert.equal(due[0].url, "https://example.test/api/cron/official-updates");
    assert.equal(due[0].headers.Authorization, "Bearer local-test-secret");
    assert.equal(due[0].timeout_milliseconds, 300000);
    assert.equal((await dispatch()).length, 1, "a call that never starts leaves the run due for the next tick");
    await db.exec("update public.official_monitor_settings set next_run_at=now()+interval '1 day'");
    assert.equal((await dispatch()).length, 0, "started/completed work must wait for its next due date");
    await db.exec("update public.official_monitor_settings set next_run_at=null");
    assert.equal((await dispatch()).length, 1, "admin settings changes reset the due date and remain effective");
    await db.exec("delete from vault.decrypted_secrets where name='harmony_palette_cron_secret'");
    await assert.rejects(db.exec(operation), /Configure the existing site URL/);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});
