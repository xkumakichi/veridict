/**
 * Veridict — SQLite execution log store
 * Uses sql.js (pure JS, no native dependencies)
 */

import initSqlJs, { Database } from "sql.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ExecutionEntry, ToolStats } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT,
  success INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  error_message TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_server_tool ON executions(server_name, tool_name);
CREATE INDEX IF NOT EXISTS idx_timestamp ON executions(timestamp);
`;

export class VerdictStore {
  private db: Database | null = null;
  private dbPath: string;
  private initPromise: Promise<void>;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(os.homedir(), ".veridict", "executions.db");
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Load existing DB or create new
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(SCHEMA);
    this.save();
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  private async ensureReady(): Promise<Database> {
    await this.initPromise;
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  /** Log a single tool execution */
  async logExecution(entry: ExecutionEntry): Promise<void> {
    const db = await this.ensureReady();
    db.run(
      `INSERT INTO executions (server_name, tool_name, input_hash, output_hash, success, latency_ms, error_message, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.serverName,
        entry.toolName,
        entry.inputHash,
        entry.outputHash,
        entry.success ? 1 : 0,
        entry.latencyMs,
        entry.errorMessage,
        entry.timestamp || new Date().toISOString(),
      ]
    );
    this.save();
  }

  /** Get aggregated statistics for a server (optionally filtered by tool) */
  async getStats(serverName: string, toolName?: string): Promise<ToolStats> {
    const db = await this.ensureReady();

    const where = toolName
      ? "WHERE server_name = ? AND tool_name = ?"
      : "WHERE server_name = ?";
    const params = toolName ? [serverName, toolName] : [serverName];

    const row = db.exec(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failure_count,
        AVG(latency_ms) as avg_latency,
        MAX(CASE WHEN success = 0 THEN timestamp ELSE NULL END) as last_failure,
        MAX(timestamp) as last_execution
      FROM executions ${where}`,
      params
    );

    if (!row.length || !row[0].values.length) {
      return {
        serverName,
        toolName: toolName || null,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgLatencyMs: 0,
        lastFailure: null,
        lastExecution: null,
      };
    }

    const [total, successCount, failureCount, avgLatency, lastFailure, lastExecution] =
      row[0].values[0];

    const totalNum = Number(total) || 0;
    const successNum = Number(successCount) || 0;

    return {
      serverName,
      toolName: toolName || null,
      totalExecutions: totalNum,
      successCount: successNum,
      failureCount: Number(failureCount) || 0,
      successRate: totalNum > 0 ? successNum / totalNum : 0,
      avgLatencyMs: Math.round(Number(avgLatency) || 0),
      lastFailure: (lastFailure as string) || null,
      lastExecution: (lastExecution as string) || null,
    };
  }

  /** Get per-tool breakdown for a server */
  async getToolBreakdown(serverName: string): Promise<ToolStats[]> {
    const db = await this.ensureReady();

    const rows = db.exec(
      `SELECT
        tool_name,
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failure_count,
        AVG(latency_ms) as avg_latency,
        MAX(CASE WHEN success = 0 THEN timestamp ELSE NULL END) as last_failure,
        MAX(timestamp) as last_execution
      FROM executions
      WHERE server_name = ?
      GROUP BY tool_name
      ORDER BY total DESC`,
      [serverName]
    );

    if (!rows.length) return [];

    return rows[0].values.map((r) => ({
      serverName,
      toolName: r[0] as string,
      totalExecutions: Number(r[1]) || 0,
      successCount: Number(r[2]) || 0,
      failureCount: Number(r[3]) || 0,
      successRate: Number(r[1]) > 0 ? Number(r[2]) / Number(r[1]) : 0,
      avgLatencyMs: Math.round(Number(r[4]) || 0),
      lastFailure: (r[5] as string) || null,
      lastExecution: (r[6] as string) || null,
    }));
  }

  /** Get all unique server names */
  async getServers(): Promise<string[]> {
    const db = await this.ensureReady();
    const rows = db.exec("SELECT DISTINCT server_name FROM executions ORDER BY server_name");
    if (!rows.length) return [];
    return rows[0].values.map((r) => r[0] as string);
  }

  /** Close the database */
  async close(): Promise<void> {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}
