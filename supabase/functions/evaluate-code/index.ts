import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  input: Record<string, unknown>;
  expected: unknown;
}

interface EvaluationRequest {
  code: string;
  language: 'javascript' | 'python' | 'java' | 'c';
  testCases: TestCase[];
  functionName?: string;
}

// Convert Python code to JavaScript
const pythonToJs = (code: string): string => {
  const lines = code.split('\n');
  const jsLines: string[] = [];
  const indentStack: number[] = [0];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Calculate current indentation
    const currentIndent = line.search(/\S/);
    if (currentIndent === -1) continue;
    
    // Close blocks when indentation decreases
    while (indentStack.length > 1 && currentIndent <= indentStack[indentStack.length - 1]) {
      indentStack.pop();
      jsLines.push('  '.repeat(indentStack.length) + '}');
    }
    
    // Transform Python to JS
    let jsLine = trimmed
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!')
      .replace(/\*\*/g, '**')
      .replace(/\/\//g, '/ ')  // Integer division (simplified)
      .replace(/len\(([^)]+)\)/g, '$1.length')
      .replace(/str\(([^)]+)\)/g, 'String($1)')
      .replace(/int\(([^)]+)\)/g, 'parseInt($1)')
      .replace(/float\(([^)]+)\)/g, 'parseFloat($1)')
      .replace(/abs\(([^)]+)\)/g, 'Math.abs($1)')
      .replace(/min\(([^)]+)\)/g, 'Math.min($1)')
      .replace(/max\(([^)]+)\)/g, 'Math.max($1)')
      .replace(/sum\(([^)]+)\)/g, '$1.reduce((a,b)=>a+b,0)')
      .replace(/range\((\d+)\)/g, 'Array.from({length:$1},(_,i)=>i)')
      .replace(/range\((\d+),\s*(\d+)\)/g, 'Array.from({length:$2-$1},(_,i)=>i+$1)');
    
    // Handle function definitions
    if (jsLine.startsWith('def ')) {
      const match = jsLine.match(/def\s+(\w+)\s*\(([^)]*)\)\s*:/);
      if (match) {
        jsLine = `function ${match[1]}(${match[2]}) {`;
        indentStack.push(currentIndent);
      }
    }
    // Handle if statements
    else if (jsLine.startsWith('if ') && jsLine.endsWith(':')) {
      const condition = jsLine.slice(3, -1).trim();
      jsLine = `if (${condition}) {`;
      indentStack.push(currentIndent);
    }
    // Handle elif
    else if (jsLine.startsWith('elif ') && jsLine.endsWith(':')) {
      const condition = jsLine.slice(5, -1).trim();
      jsLine = `} else if (${condition}) {`;
    }
    // Handle else
    else if (jsLine === 'else:') {
      jsLine = '} else {';
    }
    // Handle for loops
    else if (jsLine.startsWith('for ') && jsLine.endsWith(':')) {
      const match = jsLine.match(/for\s+(\w+)\s+in\s+(.+):/);
      if (match) {
        const varName = match[1];
        const iterable = match[2].trim();
        
        if (iterable.startsWith('range(')) {
          const rangeMatch = iterable.match(/range\(([^,)]+)(?:,\s*([^)]+))?\)/);
          if (rangeMatch) {
            if (rangeMatch[2]) {
              jsLine = `for (let ${varName} = ${rangeMatch[1]}; ${varName} < ${rangeMatch[2]}; ${varName}++) {`;
            } else {
              jsLine = `for (let ${varName} = 0; ${varName} < ${rangeMatch[1]}; ${varName}++) {`;
            }
          }
        } else {
          jsLine = `for (const ${varName} of ${iterable}) {`;
        }
        indentStack.push(currentIndent);
      }
    }
    // Handle while loops
    else if (jsLine.startsWith('while ') && jsLine.endsWith(':')) {
      const condition = jsLine.slice(6, -1).trim();
      jsLine = `while (${condition}) {`;
      indentStack.push(currentIndent);
    }
    // Handle return statements
    else if (jsLine.startsWith('return ')) {
      jsLine = jsLine + ';';
    }
    // Handle variable assignments and other statements
    else if (!jsLine.endsWith('{') && !jsLine.endsWith('}')) {
      if (!jsLine.endsWith(';')) {
        jsLine = jsLine + ';';
      }
    }
    
    jsLines.push('  '.repeat(indentStack.length - 1) + jsLine);
  }
  
  // Close any remaining open blocks
  while (indentStack.length > 1) {
    indentStack.pop();
    jsLines.push('  '.repeat(indentStack.length) + '}');
  }
  
  return jsLines.join('\n');
};

// Convert Java/C code to JavaScript (simplified)
const javaCToJs = (code: string): string => {
  // Extract function - handle various patterns
  const funcMatch = code.match(/(?:public\s+static\s+)?(?:int|long|double|float|String|boolean|void|char)\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*)\}/);
  
  if (!funcMatch) {
    // Try simpler C function pattern
    const cMatch = code.match(/(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*)\}/);
    if (cMatch) {
      const fnName = cMatch[2];
      const params = cMatch[3]
        .split(',')
        .map(p => p.trim().split(/\s+/).pop())
        .filter(Boolean)
        .join(', ');
      const body = cMatch[4];
      return `function ${fnName}(${params}) {${body}}`;
    }
    return code;
  }
  
  const fnName = funcMatch[1];
  const params = funcMatch[2]
    .split(',')
    .map(p => p.trim().split(/\s+/).pop())
    .filter(Boolean)
    .join(', ');
  const body = funcMatch[3];
  
  return `function ${fnName}(${params}) {${body}}`;
};

// Extract function name from code
const extractFunctionName = (code: string, language: string): string | null => {
  if (language === 'javascript') {
    const match = code.match(/function\s+(\w+)/);
    return match ? match[1] : null;
  } else if (language === 'python') {
    const match = code.match(/def\s+(\w+)/);
    return match ? match[1] : null;
  } else if (language === 'java' || language === 'c') {
    const match = code.match(/(?:public\s+static\s+)?(?:int|long|double|float|String|boolean|void|char)\s+(\w+)\s*\(/);
    if (match) return match[1];
    const cMatch = code.match(/\w+\s+(\w+)\s*\(/);
    return cMatch ? cMatch[1] : null;
  }
  return null;
};

// Evaluate code against test cases
const evaluateCode = (
  code: string, 
  language: string, 
  testCases: TestCase[], 
  functionName?: string
): { passed: number; total: number; results: { passed: boolean; input: unknown; expected: unknown; actual: unknown; error?: string }[] } => {
  const results: { passed: boolean; input: unknown; expected: unknown; actual: unknown; error?: string }[] = [];
  let passed = 0;
  
  console.log(`Evaluating ${language} code with ${testCases.length} test cases`);
  console.log(`Code:\n${code.substring(0, 200)}...`);
  
  // Get function name
  const fnName = functionName || extractFunctionName(code, language);
  
  if (!fnName) {
    console.error('Could not find function name in code');
    return {
      passed: 0,
      total: testCases.length,
      results: testCases.map(tc => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        actual: null,
        error: 'Could not find function name in code'
      }))
    };
  }
  
  console.log(`Found function name: ${fnName}`);
  
  // Convert code to JavaScript if needed
  let jsCode = code;
  if (language === 'python') {
    jsCode = pythonToJs(code);
    console.log(`Converted Python to JS:\n${jsCode}`);
  } else if (language === 'java' || language === 'c') {
    jsCode = javaCToJs(code);
    console.log(`Converted ${language} to JS:\n${jsCode}`);
  }
  
  // Run each test case
  for (const tc of testCases) {
    try {
      // Build function call with arguments
      const args = Object.values(tc.input).map(v => JSON.stringify(v)).join(', ');
      
      const evalCode = `
        ${jsCode}
        ${fnName}(${args})
      `;
      
      console.log(`Executing: ${fnName}(${args})`);
      
      // Execute the code
      const actual = new Function(`return (function() { ${evalCode} })()`)();
      
      console.log(`Result: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(tc.expected)}`);
      
      // Compare results - handle different types
      let isPassed = false;
      
      if (typeof actual === typeof tc.expected) {
        if (typeof actual === 'number' && typeof tc.expected === 'number') {
          // Handle floating point comparison
          isPassed = Math.abs(actual - tc.expected) < 0.0001;
        } else {
          isPassed = JSON.stringify(actual) === JSON.stringify(tc.expected);
        }
      }
      
      if (isPassed) passed++;
      results.push({ passed: isPassed, input: tc.input, expected: tc.expected, actual });
      
    } catch (e: unknown) {
      console.error('Test case evaluation error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      results.push({ 
        passed: false, 
        input: tc.input, 
        expected: tc.expected, 
        actual: null, 
        error: `Execution error: ${errorMessage}` 
      });
    }
  }
  
  console.log(`Evaluation complete: ${passed}/${testCases.length} passed`);
  return { passed, total: testCases.length, results };
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
    
    const result = evaluateCode(code, language, testCases, functionName);
    
    return new Response(
      JSON.stringify(result),
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
