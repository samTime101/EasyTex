#!/usr/bin/env node
// The reference binding of the EasyTeX engine contract.
//
// The engine is platform independent; a host is not. This program is one
// such host: a command line front end that speaks the JSON contract in
// ENGINE.md over standard input and standard output. It runs the same on
// Windows, Linux, and macOS, and it is the template for a binding written in
// another language.
//
//   node tools/easytex-engine.mjs compile --source "x = frac(1, 2)"
//   node tools/easytex-engine.mjs document --file note.math
//   node tools/easytex-engine.mjs manifest --pretty
//   node tools/easytex-engine.mjs serve            # newline-delimited JSON
//
// Every command writes one JSON object to standard output. Diagnostics are
// data, not text: they arrive as structured objects with source spans.

import { readFileSync } from "node:fs";
import { stdin, stdout, argv, exit } from "node:process";
import {
  compile,
  compileDocument,
  engineManifest,
  ENGINE_NAME,
  ENGINE_VERSION
} from "../src/engine.js";

function parseArguments(args) {
  const options = { command: null, source: null, file: null, pretty: false, includeAst: false, complex: true };
  const rest = [...args];

  while (rest.length > 0) {
    const argument = rest.shift();
    if (argument === "--pretty") {
      options.pretty = true;
      continue;
    }
    if (argument === "--include-ast") {
      options.includeAst = true;
      continue;
    }
    if (argument === "--real") {
      options.complex = false;
      continue;
    }
    if (argument === "--source") {
      options.source = rest.shift() ?? "";
      continue;
    }
    if (argument === "--file") {
      options.file = rest.shift() ?? null;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (!options.command) {
      options.command = argument;
      continue;
    }
    throw new Error(`Unexpected argument: ${argument}`);
  }

  return options;
}

function readSource(options) {
  if (options.source !== null) return options.source;
  if (options.file) return readFileSync(options.file, "utf8");
  return readStdin();
}

function readStdin() {
  if (stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function serialize(value, pretty) {
  return pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
}

function diagnosticsOf(result) {
  return result.diagnostics.map((entry) => ({
    severity: entry.severity,
    category: entry.category,
    message: entry.message,
    span: entry.span ?? null
  }));
}

function compileExpression(request) {
  const result = compile(request.source ?? "", { complex: request.options?.complex !== false });
  const response = {
    ok: result.diagnostics.every((entry) => entry.severity !== "error"),
    mathml: result.mathml,
    latex: result.latex,
    diagnostics: diagnosticsOf(result)
  };
  if (request.includeAst === true) response.ast = result.ast;
  return response;
}

function compileDocumentSource(request) {
  const result = compileDocument(request.source ?? "", { complex: request.options?.complex !== false });
  const response = {
    ok: result.diagnostics.every((entry) => entry.severity !== "error"),
    html: result.html,
    latex: result.latex,
    diagnostics: diagnosticsOf(result)
  };
  if (request.includeAst === true) response.ast = result.ast;
  return response;
}

function handleRequest(request) {
  const command = request.command;
  if (command === "compile") return compileExpression(request);
  if (command === "document") return compileDocumentSource(request);
  if (command === "manifest") return engineManifest();
  if (command === "version") {
    return { engine: ENGINE_NAME, version: ENGINE_VERSION, language: "MathScript" };
  }
  throw new Error(`Unknown command: ${command}`);
}

function respond(request, result, pretty) {
  return {
    id: request.id ?? null,
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    command: request.command,
    ok: true,
    result
  };
}

function respondWithError(request, error, pretty) {
  return {
    id: request?.id ?? null,
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    command: request?.command ?? null,
    ok: false,
    error: { message: error instanceof Error ? error.message : String(error) }
  };
}

function serve(pretty) {
  let buffer = "";
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line !== "") {
        let request = null;
        try {
          request = JSON.parse(line);
          stdout.write(`${serialize(respond(request, handleRequest(request), pretty), pretty)}\n`);
        } catch (error) {
          stdout.write(`${serialize(respondWithError(request, error, pretty), pretty)}\n`);
        }
      }
      newline = buffer.indexOf("\n");
    }
  });
  stdin.on("end", () => {
    const line = buffer.trim();
    if (line === "") return;
    let request = null;
    try {
      request = JSON.parse(line);
      stdout.write(`${serialize(respond(request, handleRequest(request), pretty), pretty)}\n`);
    } catch (error) {
      stdout.write(`${serialize(respondWithError(request, error, pretty), pretty)}\n`);
    }
  });
}

function main() {
  let options;
  try {
    options = parseArguments(argv.slice(2));
  } catch (error) {
    stdout.write(`${serialize(respondWithError(null, error, false), false)}\n`);
    exit(2);
    return;
  }

  const command = options.command ?? "compile";

  if (command === "serve") {
    serve(options.pretty);
    return;
  }

  let request = { command, includeAst: options.includeAst };
  try {
    if (command === "manifest" || command === "version") {
      request.source = "";
    } else {
      request.source = readSource(options);
    }
    request.options = { complex: options.complex };
    const result = handleRequest(request);
    stdout.write(`${serialize(respond(request, result, options.pretty), options.pretty)}\n`);
  } catch (error) {
    stdout.write(`${serialize(respondWithError(request, error, options.pretty), options.pretty)}\n`);
    exit(1);
  }
}

main();
