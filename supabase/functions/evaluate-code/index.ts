import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Judge0 language IDs
const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,  // Node.js
  python: 71,      // Python 3
  java: 62,        // Java
  c: 50,           // C (GCC)
  cpp: 54,         // C++ (GCC)
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
      // For Java, we need a main method wrapper
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

// Submit code to Judge0 and get result
const executeWithJudge0 = async (
  sourceCode: string,
  languageId: number,
  expectedOutput?: string
): Promise<{ stdout: string | null; stderr: string | null; status: { id: number; description: string }; time: string; memory: number }> => {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY is not configured');
  }

  const judge0Url = 'https://judge0-ce.p.rapidapi.com';
  
  // Create submission
  const createResponse = await fetch(`${judge0Url}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    body: JSON.stringify({
      source_code: btoa(sourceCode),
      language_id: languageId,
      expected_output: expectedOutput ? btoa(expectedOutput) : undefined,
      cpu_time_limit: 5,
      memory_limit: 128000,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Judge0 API error:', createResponse.status, errorText);
    throw new Error(`Judge0 API error: ${createResponse.status} - ${errorText}`);
  }

  const result = await createResponse.json();
  
  return {
    stdout: result.stdout ? atob(result.stdout) : null,
    stderr: result.stderr ? atob(result.stderr) : null,
    status: result.status,
    time: result.time || '0',
    memory: result.memory || 0,
  };
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

    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}` }),
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

    const results: { passed: boolean; input: unknown; expected: unknown; actual: unknown; error?: string; executionTime?: string }[] = [];
    let passed = 0;

    // Run each test case
    for (const tc of testCases) {
      try {
        const wrappedCode = generateWrapperCode(code, language, fnName, tc.input);
        console.log(`Executing test case with input: ${JSON.stringify(tc.input)}`);
        
        const execution = await executeWithJudge0(wrappedCode, languageId);
        
        console.log(`Execution result: status=${execution.status.description}, stdout=${execution.stdout}, stderr=${execution.stderr}`);
        
        // Check if execution was successful
        if (execution.status.id !== 3) { // 3 = Accepted
          results.push({
            passed: false,
            input: tc.input,
            expected: tc.expected,
            actual: null,
            error: execution.stderr || execution.status.description,
            executionTime: execution.time,
          });
          continue;
        }
        
        // Compare output
        const isPassed = compareOutputs(execution.stdout, tc.expected);
        
        if (isPassed) passed++;
        
        results.push({
          passed: isPassed,
          input: tc.input,
          expected: tc.expected,
          actual: execution.stdout?.trim() || null,
          executionTime: execution.time,
        });
        
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