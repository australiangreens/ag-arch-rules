export type ArchVitestConfigOptions = {
  /** The arch check file to run. Defaults to `'arch.check.ts'`. */
  checkFile?: string;
  /**
   * Vitest worker pool. Defaults to `'forks'`, which is required for correct
   * operation of the dependency-graph rules that use native Node.js APIs.
   */
  pool?: string;
  /** Test timeout in milliseconds. Defaults to `30000`. */
  testTimeout?: number;
};

/**
 * Returns a Vitest inline config object with defaults suited to running arch
 * checks. Pass the result as the default export of your `arch.vitest.config.ts`.
 *
 * All options have sensible defaults and can be overridden individually:
 *
 * ```ts
 * export default defineArchVitestConfig({
 *   checkFile: 'arch.check.ts', // default
 *   pool: 'forks',              // default — needed for graph rules
 *   testTimeout: 30000,         // default — arch checks can be slow
 * });
 * ```
 */
export function defineArchVitestConfig(options?: ArchVitestConfigOptions) {
  return {
    test: {
      globals: true,
      include: [options?.checkFile ?? 'arch.check.ts'],
      pool: options?.pool ?? 'forks',
      testTimeout: options?.testTimeout ?? 30000,
    },
  };
}
