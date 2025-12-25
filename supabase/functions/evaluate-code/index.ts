import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Piston API language versions
const LANGUAGE_VERSIONS: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
};

interface TestCase {
  input: Record<string, unknown>;
  expected: unknown;
}

interface EvaluationRequest {
  code: string;
  language: 'javascript' | 'python' | 'java' | 'c' | 'cpp';
  testCases: TestCase[];
  functionName?: string;
}

// Generate wrapper code to run the function with test input
const generateWrapperCode = (
  code: string,
  language: string,
  functionName: string,
  testInput: Record<string, unknown>
): string => {
  const args = Object.values(testInput);
  const argsStr = args.map(v => JSON.stringify(v)).join(', ');

  switch (language) {
    case 'javascript':
      return `${code}\nconsole.log(JSON.stringify(${functionName}(${argsStr})));`;
    
    case 'python':
      return `import json\n${code}\nprint(json.dumps(${functionName}(${argsStr})))`;
    
    case 'java':
      return `import com.google.gson.Gson;
public class Main {
    ${code.replace(/public\s+class\s+\w+\s*\{/, '').replace(/\}\s*$/, '')}
    
    public static void main(String[] args) {
        Gson gson = new Gson();
        System.out.println(gson.toJson(${functionName}(${argsStr})));
    }
}`;
    
    case 'c':
    case 'cpp':
      return `#include <stdio.h>
#include <stdlib.h>
${code}

int main() {
    printf("%d\\n", ${functionName}(${argsStr}));
    return 0;
}`;
    
    default:
      return code;
  }
};

// Extract function name from code
const extractFunctionName = (code: string, language: string): string | null => {
  if (language === 'javascript') {
    const match = code.match(/function\s+(\w+)/);
    if (match) return match[1];
    const arrowMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>/);
    return arrowMatch ? arrowMatch[1] : null;
  } else if (language === 'python') {
    const match = code.match(/def\s+(\w+)/);
    return match ? match[1] : null;
  } else if (language === 'java') {
    const match = code.match(/(?:public\s+static\s+)?(?:int|long|double|float|String|boolean|void|char|Object)\s+(\w+)\s*\(/);
    return match ? match[1] : null;
  } else if (language === 'c' || language === 'cpp') {
    const match = code.match(/(?:int|long|double|float|char|void)\s+(\w+)\s*\(/);
    return match ? match[1] : null;
  }
  return null;
};

// Execute code using Piston API (free, no API key required)
const executeWithPiston = async (
  sourceCode: string,
  language: string
): Promise<{ stdout: string | null; stderr: string | null; error?: string }> => {
  const langConfig = LANGUAGE_VERSIONS[language];
  
  if (!langConfig) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language: langConfig.language,
      version: langConfig.version,
      files: [{ content: sourceCode }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Piston API error:', response.status, errorText);
    throw new Error(`Piston API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.run) {
    return {
      stdout: result.run.stdout || null,
      stderr: result.run.stderr || null,
      error: result.run.code !== 0 ? result.run.stderr : undefined,
    };
  }

  return { stdout: null, stderr: null, error: 'Unknown execution error' };
};

// Compare outputs with tolerance for different formats
const compareOutputs = (actual: string | null, expected: unknown): boolean => {
  if (actual === null) return false;
  
  const trimmedActual = actual.trim();
  
  // Try to parse as JSON and compare
  try {
    const parsedActual = JSON.parse(trimmedActual);
    const parsedExpected = typeof expected === 'string' ? JSON.parse(expected) : expected;
    
    // Handle floating point comparison
    if (typeof parsedActual === 'number' && typeof parsedExpected === 'number') {
      return Math.abs(parsedActual - parsedExpected) < 0.0001;
    }
    
    return JSON.stringify(parsedActual) === JSON.stringify(parsedExpected);
  } catch {
    // Direct string comparison
    return trimmedActual === String(expected).trim();
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases, functionName }: EvaluationRequest = await req.json();
    
    console.log(`Received evaluation request for ${language}`);
    console.log(`Code length: ${code.length}, Test cases: ${testCases.length}`);
    
    if (!code || !language || !testCases) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, language, testCases' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return new Response(
        JSON.stringify({ error: 'testCases must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LANGUAGE_VERSIONS[language]) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}. Supported: javascript, python, java, c, cpp` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get function name
    const fnName = functionName || extractFunctionName(code, language);
    
    if (!fnName) {
      console.error('Could not find function name in code');
      return new Response(
        JSON.stringify({
          passed: 0,
          total: testCases.length,
          results: testCases.map(tc => ({
            passed: false,
            input: tc.input,
            expected: tc.expected,
            actual: null,
            error: 'Could not find function name in code. Make sure you define a function (e.g., function solution(...) or def solution(...)).'
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found function name: ${fnName}`);

    const results: { passed: boolean; input: unknown; expected: unknown; actual: unknown; error?: string }[] = [];
    let passed = 0;

    // Run each test case
    for (const tc of testCases) {
      try {
        const wrappedCode = generateWrapperCode(code, language, fnName, tc.input);
        console.log(`Executing test case with input: ${JSON.stringify(tc.input)}`);
        
        const execution = await executeWithPiston(wrappedCode, language);
        
        console.log(`Execution result: stdout=${execution.stdout}, stderr=${execution.stderr}`);
        
        // Check if execution had errors
        if (execution.error || (execution.stderr && execution.stderr.trim())) {
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.expected,
            actual: null,
            error: execution.error || execution.stderr || undefined,
          });
          continue;
        }
        
        // Compare output
        const isPassed = compareOutputs(execution.stdout, tc.expected);
        
        if (isPassed) passed++;
        
        let actualValue = null;
        try {
          actualValue = execution.stdout ? JSON.parse(execution.stdout.trim()) : null;
        } catch {
          actualValue = execution.stdout?.trim() || null;
        }
        
        results.push({
          passed: isPassed,
          input: tc.input,
          expected: tc.expected,
          actual: actualValue,
        });
        
        // Small delay between test cases
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (e: unknown) {
        console.error('Test case execution error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        results.push({
          passed: false,
          input: tc.input,
          expected: tc.expected,
          actual: null,
          error: `Execution error: ${errorMessage}`,
        });
      }
    }

    console.log(`Evaluation complete: ${passed}/${testCases.length} passed`);
    
    return new Response(
      JSON.stringify({ passed, total: testCases.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Evaluation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
