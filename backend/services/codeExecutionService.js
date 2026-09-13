const vm = require('vm');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { performance } = require('perf_hooks');

/**
 * Normalizes values for comparison (handles JSON strings, arrays, objects, primitives, whitespace)
 */
function normalizeOutput(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }
  return String(val).trim();
}

/**
 * Parses test case input string into JS arguments array
 */
function parseInputArgs(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return [];
  const trimmed = inputStr.trim();
  try {
    const wrapped = `[${trimmed}]`;
    const parsed = JSON.parse(wrapped);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {}

  try {
    return [JSON.parse(trimmed)];
  } catch (e) {
    return [trimmed];
  }
}

/**
 * Checks if actual output matches expected output
 */
function areOutputsEqual(actual, expectedStr) {
  const normActual = normalizeOutput(actual);
  const normExpected = (expectedStr || '').trim();

  if (normActual === normExpected) return true;

  try {
    const parsedActual = typeof actual === 'string' ? JSON.parse(actual) : actual;
    const parsedExpected = JSON.parse(normExpected);
    return JSON.stringify(parsedActual) === JSON.stringify(parsedExpected);
  } catch (e) {
    return normActual.toLowerCase() === normExpected.toLowerCase();
  }
}

function stripComments(code) {
  return (code || '').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
}

const KNOWN_FUNCTIONS = [
  'twoSum', 'isPalindrome', 'search', 'maxSubArray', 'findKthLargest',
  'reverseList', 'mergeTwoLists', 'isValid', 'climbStairs', 'maxProfit',
  'lengthOfLongestSubstring', 'coinChange', 'numIslands', 'hasCycle', 'maxDepth',
  'singleNumber', 'productExceptSelf', 'groupAnagrams', 'longestConsecutive'
];

function detectFunctionName(code) {
  const cleanCode = stripComments(code);

  // 1. Check known algorithmic names
  for (const fn of KNOWN_FUNCTIONS) {
    const regex = new RegExp(`\\b${fn}\\b`);
    if (regex.test(cleanCode)) return fn;
  }

  // 2. JS function declaration: function name(
  const fnMatch = cleanCode.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (fnMatch) return fnMatch[1];

  // 3. JS variable assignment: const/let/var name = (function|arrow)
  const varMatch = cleanCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function\s*\(|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>)/);
  if (varMatch) return varMatch[1];

  // 4. Python def: def name(
  const pyMatch = cleanCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
  if (pyMatch) return pyMatch[1];

  // 5. C++ / Java / C methods: returnType name(
  const cMatch = cleanCode.match(/(?:(?:public|private|protected|static|virtual|inline)\s+)*(?:(?:unsigned\s+)?(?:int|long(?:\s+long)?|short|char|float|double|bool|void|string|vector<[^>]+>|ListNode\*?|TreeNode\*?|int\[\]|String\[\]|List<[^>]+>|boolean))\s+(?:Solution::)?([a-zA-Z0-9_]+)\s*\(/);
  if (cMatch) return cMatch[1];

  return 'solution';
}

/**
 * Safely executes JavaScript code in a sandboxed Node VM
 */
async function executeJavaScript(userCode, testCases = [], timeoutMs = 3000) {
  const results = [];
  const targetFn = detectFunctionName(userCode);

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const logs = [];

    const customConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args) => logs.push('[Error] ' + args.join(' ')),
      warn: (...args) => logs.push('[Warn] ' + args.join(' ')),
      info: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
    };

    const sandbox = {
      console: customConsole,
      Math,
      Number,
      String,
      Array,
      Object,
      Set,
      Map,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      JSON,
      Date,
      RegExp,
      Infinity,
      NaN
    };

    const context = vm.createContext(sandbox);
    const startTime = performance.now();
    let actualOutput = null;
    let passed = false;
    let errorStr = '';

    try {
      const args = parseInputArgs(tc.input);
      const executionScript = `
        ${userCode}

        (function() {
          let fn = null;
          if (typeof ${targetFn} === 'function') {
            fn = ${targetFn};
          } else if (typeof solution === 'function') {
            fn = solution;
          } else if (typeof solve === 'function') {
            fn = solve;
          }

          if (typeof fn !== 'function') {
            throw new Error('Solution function "${targetFn}" not found in your code.');
          }

          const args = ${JSON.stringify(args)};
          return fn(...args);
        })();
      `;

      const script = new vm.Script(executionScript);
      actualOutput = script.runInContext(context, { timeout: timeoutMs });
      const endTime = performance.now();
      const executionTimeMs = Math.max(1, Math.round(endTime - startTime));
      passed = areOutputsEqual(actualOutput, tc.expectedOutput);

      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: normalizeOutput(actualOutput),
        passed,
        executionTimeMs,
        stdout: logs.join('\n'),
        error: ''
      });
    } catch (err) {
      const endTime = performance.now();
      const executionTimeMs = Math.max(1, Math.round(endTime - startTime));
      errorStr = err.message || 'Execution Error';

      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: 'Error: ' + errorStr,
        passed: false,
        executionTimeMs,
        stdout: logs.join('\n'),
        error: errorStr
      });
    }
  }

  return results;
}

/**
 * Executes Python Code via subprocess
 */
async function executePython(userCode, testCases = []) {
  const targetFn = detectFunctionName(userCode);
  const runnerScript = `
import sys, json

${userCode}

def _to_json(val):
    if val is None:
        return 'null'
    if isinstance(val, bool):
        return 'true' if val else 'false'
    return json.dumps(val)

def _main():
    test_cases = ${JSON.stringify(testCases)}
    results = []
    
    target_fn = None
    if 'Solution' in globals():
        sol = Solution()
        if hasattr(sol, '${targetFn}'):
            target_fn = getattr(sol, '${targetFn}')
        else:
            for attr in dir(sol):
                if not attr.startswith('_') and callable(getattr(sol, attr)):
                    target_fn = getattr(sol, attr)
                    break
    
    if not target_fn and '${targetFn}' in globals() and callable(globals()['${targetFn}']):
        target_fn = globals()['${targetFn}']
        
    if not target_fn and 'solution' in globals() and callable(globals()['solution']):
        target_fn = globals()['solution']
    if not target_fn and 'solve' in globals() and callable(globals()['solve']):
        target_fn = globals()['solve']

    if not target_fn:
        results = [{"output": "", "error": "Solution function '${targetFn}' not found"} for _ in test_cases]
        print("###RESULTS_START###")
        print(json.dumps(results))
        return

    for tc in test_cases:
        try:
            inp_wrapped = '[' + tc['input'] + ']'
            args = json.loads(inp_wrapped)
            out = target_fn(*args)
            results.append({"output": _to_json(out), "error": ""})
        except Exception as e:
            results.append({"output": "", "error": str(e)})
            
    print("###RESULTS_START###")
    print(json.dumps(results))

if __name__ == '__main__':
    _main()
`;

  const tempFile = path.join(os.tmpdir(), `py_run_${Date.now()}_${Math.floor(Math.random()*1000)}.py`);
  fs.writeFileSync(tempFile, runnerScript, 'utf8');
  const startTime = performance.now();

  try {
    const res = spawnSync('python', [tempFile], { timeout: 5000, encoding: 'utf8' });
    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

    if (res.status !== 0 && (!res.stdout || !res.stdout.includes('###RESULTS_START###'))) {
      const err = res.stderr || 'Python execution error';
      return testCases.map((tc, idx) => ({
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: 'Syntax/Runtime Error',
        passed: false,
        executionTimeMs,
        stdout: '',
        error: err.split('\n').filter(l => l.trim()).slice(-3).join('\n') || err
      }));
    }

    const parts = (res.stdout || '').split('###RESULTS_START###');
    const parsedOutputs = parts.length > 1 ? JSON.parse(parts[1].trim()) : [];

    return testCases.map((tc, idx) => {
      const item = parsedOutputs[idx] || { output: '', error: 'Execution failed' };
      const actualOutput = item.error ? `Error: ${item.error}` : item.output;
      const passed = !item.error && areOutputsEqual(item.output, tc.expectedOutput);

      return {
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        passed,
        executionTimeMs,
        stdout: `[Python Runner] Executed test case ${idx + 1}`,
        error: item.error || ''
      };
    });
  } finally {
    try { fs.unlinkSync(tempFile); } catch (e) {}
  }
}

/**
 * Executes C++ Code via g++ compilation and execution
 */
async function executeCpp(userCode, testCases = []) {
  const targetFn = detectFunctionName(userCode);
  const dataStructures = `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <sstream>
#include <stack>
#include <queue>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

void printVal(int v) { cout << v; }
void printVal(long long v) { cout << v; }
void printVal(double v) { cout << v; }
void printVal(bool v) { cout << (v ? "true" : "false"); }
void printVal(const string& v) { cout << "\\"" << v << "\\""; }
void printVal(const vector<int>& v) {
    cout << "[";
    for(size_t i = 0; i < v.size(); ++i) {
        cout << v[i];
        if(i + 1 < v.size()) cout << ", ";
    }
    cout << "]";
}
void printVal(const vector<string>& v) {
    cout << "[";
    for(size_t i = 0; i < v.size(); ++i) {
        cout << "\\"" << v[i] << "\\"";
        if(i + 1 < v.size()) cout << ", ";
    }
    cout << "]";
}
`;

  const hasSolutionClass = userCode.includes('class Solution');
  const runner = `
${dataStructures}

${userCode}

int main() {
    ${hasSolutionClass ? 'Solution sol;' : ''}
    cout << "###OUTPUT_START###\\n";
    ${testCases.map((tc, idx) => {
      let args = [];
      try { args = JSON.parse(`[${tc.input}]`); } catch(e) { args = [tc.input]; }

      let decls = [];
      let callParams = [];
      args.forEach((arg, aIdx) => {
        const varName = `p_${idx}_${aIdx}`;
        if (Array.isArray(arg)) {
          if (typeof arg[0] === 'number') {
            decls.push(`vector<int> ${varName} = {${arg.join(', ')}};`);
          } else if (typeof arg[0] === 'string') {
            decls.push(`vector<string> ${varName} = {${arg.map(s => `"${s}"`).join(', ')}};`);
          } else {
            decls.push(`vector<int> ${varName} = {};`);
          }
        } else if (typeof arg === 'number') {
          decls.push(`int ${varName} = ${arg};`);
        } else if (typeof arg === 'string') {
          decls.push(`string ${varName} = "${arg.replace(/"/g, '\\"')}";`);
        } else if (typeof arg === 'boolean') {
          decls.push(`bool ${varName} = ${arg ? 'true' : 'false'};`);
        }
        callParams.push(varName);
      });

      const caller = hasSolutionClass ? `sol.${targetFn}` : targetFn;
      return `
      {
          ${decls.join('\n          ')}
          cout << "CASE_${idx}:";
          auto res = ${caller}(${callParams.join(', ')});
          printVal(res);
          cout << "\\n";
      }
      `;
    }).join('\n')}
    cout << "###OUTPUT_END###\\n";
    return 0;
}
`;

  const baseName = `cpp_run_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const srcFile = path.join(os.tmpdir(), `${baseName}.cpp`);
  const exeFile = path.join(os.tmpdir(), `${baseName}.exe`);

  fs.writeFileSync(srcFile, runner, 'utf8');
  const startTime = performance.now();

  try {
    const compileRes = spawnSync('g++', ['-O2', '-std=c++14', srcFile, '-o', exeFile], {
      timeout: 8000,
      encoding: 'utf8'
    });

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

    if (compileRes.status !== 0) {
      const err = compileRes.stderr || 'Compilation error';
      return testCases.map((tc, idx) => ({
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: 'Compilation Error',
        passed: false,
        executionTimeMs,
        stdout: '',
        error: err.split('\n').filter(l => l.includes('error:')).slice(0, 3).join('\n') || err
      }));
    }

    const runRes = spawnSync(exeFile, [], { timeout: 3000, encoding: 'utf8' });
    const stdout = runRes.stdout || '';

    return testCases.map((tc, idx) => {
      const match = stdout.match(new RegExp(`CASE_${idx}:([^\\r\\n]+)`));
      const actualOutput = match ? match[1].trim() : 'Runtime Error';
      const passed = match ? areOutputsEqual(actualOutput, tc.expectedOutput) : false;

      return {
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        passed,
        executionTimeMs,
        stdout: `[C++ Runner] Executed test case ${idx + 1}`,
        error: match ? '' : (runRes.stderr || 'Execution failed')
      };
    });
  } finally {
    try { fs.unlinkSync(srcFile); } catch (e) {}
    try { fs.unlinkSync(exeFile); } catch (e) {}
  }
}

/**
 * Executes Java Code via single-file java runner
 */
async function executeJava(userCode, testCases = []) {
  const targetFn = detectFunctionName(userCode);
  const runner = `
import java.util.*;

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

${userCode}

public class MainRunner {
    public static void printVal(Object obj) {
        if (obj == null) {
            System.out.print("null");
        } else if (obj instanceof int[]) {
            System.out.print(Arrays.toString((int[]) obj));
        } else if (obj instanceof String[]) {
            System.out.print(Arrays.toString((String[]) obj));
        } else if (obj instanceof List) {
            System.out.print(obj.toString());
        } else if (obj instanceof Boolean) {
            System.out.print((Boolean) obj ? "true" : "false");
        } else {
            System.out.print(obj.toString());
        }
    }

    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println("###OUTPUT_START###");
        ${testCases.map((tc, idx) => {
          let args = [];
          try { args = JSON.parse(`[${tc.input}]`); } catch(e) { args = [tc.input]; }

          let decls = [];
          let callParams = [];
          args.forEach((arg, aIdx) => {
            const varName = `p_${idx}_${aIdx}`;
            if (Array.isArray(arg)) {
              if (typeof arg[0] === 'number') {
                decls.push(`int[] ${varName} = new int[]{${arg.join(', ')}};`);
              } else if (typeof arg[0] === 'string') {
                decls.push(`String[] ${varName} = new String[]{${arg.map(s => `"${s}"`).join(', ')}};`);
              } else {
                decls.push(`int[] ${varName} = new int[]{};`);
              }
            } else if (typeof arg === 'number') {
              decls.push(`int ${varName} = ${arg};`);
            } else if (typeof arg === 'string') {
              decls.push(`String ${varName} = "${arg.replace(/"/g, '\\"')}";`);
            } else if (typeof arg === 'boolean') {
              decls.push(`boolean ${varName} = ${arg ? 'true' : 'false'};`);
            }
            callParams.push(varName);
          });

          return `
          {
              ${decls.join('\n              ')}
              System.out.print("CASE_${idx}:");
              Object res = sol.${targetFn}(${callParams.join(', ')});
              printVal(res);
              System.out.println();
          }
          `;
        }).join('\n')}
        System.out.println("###OUTPUT_END###");
    }
}
`;

  const tmpDir = path.join(os.tmpdir(), `java_run_${Date.now()}_${Math.floor(Math.random()*1000)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const srcFile = path.join(tmpDir, 'MainRunner.java');
  fs.writeFileSync(srcFile, runner, 'utf8');
  const startTime = performance.now();

  try {
    const runRes = spawnSync('java', [srcFile], { timeout: 6000, encoding: 'utf8', cwd: tmpDir });
    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

    if (runRes.status !== 0) {
      const err = runRes.stderr || 'Java error';
      return testCases.map((tc, idx) => ({
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: 'Compilation/Runtime Error',
        passed: false,
        executionTimeMs,
        stdout: '',
        error: err.split('\n').filter(l => l.includes('error:')).slice(0, 3).join('\n') || err
      }));
    }

    const stdout = runRes.stdout || '';
    return testCases.map((tc, idx) => {
      const match = stdout.match(new RegExp(`CASE_${idx}:([^\\r\\n]+)`));
      const actualOutput = match ? match[1].trim() : 'Runtime Error';
      const passed = match ? areOutputsEqual(actualOutput, tc.expectedOutput) : false;

      return {
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        passed,
        executionTimeMs,
        stdout: `[Java Runner] Executed test case ${idx + 1}`,
        error: match ? '' : (runRes.stderr || 'Execution failed')
      };
    });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  }
}

/**
 * Executes C Code via gcc compilation and execution
 */
async function executeC(userCode, testCases = []) {
  const targetFn = detectFunctionName(userCode);
  const runner = `
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

struct ListNode {
    int val;
    struct ListNode *next;
};

${userCode}

void printInt(int v) { printf("%d", v); }
void printBool(bool v) { printf("%s", v ? "true" : "false"); }
void printStr(const char* s) { printf("\\"%s\\"", s ? s : ""); }
void printIntArr(int* arr, int size) {
    if (!arr) { printf("[]"); return; }
    printf("[");
    for(int i = 0; i < size; ++i) {
        printf("%d", arr[i]);
        if(i + 1 < size) printf(", ");
    }
    printf("]");
}

int main() {
    printf("###OUTPUT_START###\\n");
    ${testCases.map((tc, idx) => {
      let args = [];
      try { args = JSON.parse(`[${tc.input}]`); } catch(e) { args = [tc.input]; }

      let decls = [];
      let callParams = [];
      args.forEach((arg, aIdx) => {
        const varName = `p_${idx}_${aIdx}`;
        if (Array.isArray(arg)) {
          decls.push(`int ${varName}[] = {${arg.join(', ')}};`);
          decls.push(`int ${varName}_size = ${arg.length};`);
          callParams.push(varName);
          callParams.push(`${varName}_size`);
        } else if (typeof arg === 'number') {
          decls.push(`int ${varName} = ${arg};`);
          callParams.push(varName);
        } else if (typeof arg === 'string') {
          decls.push(`char ${varName}[] = "${arg.replace(/"/g, '\\"')}";`);
          callParams.push(varName);
        } else if (typeof arg === 'boolean') {
          decls.push(`bool ${varName} = ${arg ? 'true' : 'false'};`);
          callParams.push(varName);
        }
      });

      return `
      {
          ${decls.join('\n          ')}
          printf("CASE_${idx}:");
          int res = ${targetFn}(${callParams.join(', ')});
          printInt(res);
          printf("\\n");
      }
      `;
    }).join('\n')}
    printf("###OUTPUT_END###\\n");
    return 0;
}
`;

  const baseName = `c_run_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const srcFile = path.join(os.tmpdir(), `${baseName}.c`);
  const exeFile = path.join(os.tmpdir(), `${baseName}.exe`);

  fs.writeFileSync(srcFile, runner, 'utf8');
  const startTime = performance.now();

  try {
    const compileRes = spawnSync('gcc', ['-O2', '-std=c11', srcFile, '-o', exeFile], {
      timeout: 8000,
      encoding: 'utf8'
    });

    const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

    if (compileRes.status !== 0) {
      const err = compileRes.stderr || 'Compilation error';
      return testCases.map((tc, idx) => ({
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: 'Compilation Error',
        passed: false,
        executionTimeMs,
        stdout: '',
        error: err.split('\n').filter(l => l.includes('error:')).slice(0, 3).join('\n') || err
      }));
    }

    const runRes = spawnSync(exeFile, [], { timeout: 3000, encoding: 'utf8' });
    const stdout = runRes.stdout || '';

    return testCases.map((tc, idx) => {
      const match = stdout.match(new RegExp(`CASE_${idx}:([^\\r\\n]+)`));
      const actualOutput = match ? match[1].trim() : 'Runtime Error';
      const passed = match ? areOutputsEqual(actualOutput, tc.expectedOutput) : false;

      return {
        testCaseIndex: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        passed,
        executionTimeMs,
        stdout: `[C Runner] Executed test case ${idx + 1}`,
        error: match ? '' : (runRes.stderr || 'Execution failed')
      };
    });
  } finally {
    try { fs.unlinkSync(srcFile); } catch (e) {}
    try { fs.unlinkSync(exeFile); } catch (e) {}
  }
}

/**
 * Universal Code Runner across languages
 */
async function runCode(code, language = 'javascript', testCases = []) {
  if (!code || !code.trim()) {
    return testCases.map((tc, idx) => ({
      testCaseIndex: idx + 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: 'No code provided',
      passed: false,
      executionTimeMs: 0,
      stdout: '',
      error: 'Empty code submission'
    }));
  }

  const lang = (language || 'javascript').toLowerCase();

  if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    return executeJavaScript(code, testCases);
  }
  if (lang === 'python' || lang === 'py') {
    return executePython(code, testCases);
  }
  if (lang === 'cpp' || lang === 'c++') {
    return executeCpp(code, testCases);
  }
  if (lang === 'java') {
    return executeJava(code, testCases);
  }
  if (lang === 'c') {
    return executeC(code, testCases);
  }

  return executeJavaScript(code, testCases);
}

module.exports = {
  runCode,
  executeJavaScript,
  executePython,
  executeCpp,
  executeJava,
  executeC,
  areOutputsEqual,
  normalizeOutput
};

