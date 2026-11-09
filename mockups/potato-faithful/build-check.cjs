const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { parsers } = require('prettier/plugins/babel');
const esbuild = require('esbuild');

function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? files(file) : [file];
    });
}

function hashes() {
  return files(path.join(__dirname, 'dist')).map((file) => [
    path.relative(__dirname, file),
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  ]);
}

function normalized(node) {
  if (Array.isArray(node)) return node.map(normalized);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(
        ([key, value]) =>
          value !== undefined &&
          ![
            'start',
            'end',
            'loc',
            'extra',
            'comments',
            'leadingComments',
            'trailingComments',
            'innerComments',
            'tokens',
            'errors'
          ].includes(key)
      )
      .map(([key, value]) => [key, normalized(value)])
  );
}

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visitor));
    else if (value && typeof value === 'object') walk(value, visitor);
  }
}

function literal(node) {
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral')
    return node.quasis.map((part) => part.value.cooked).join('');
  if (node.type === 'BinaryExpression' && node.operator === '+')
    return literal(node.left) + literal(node.right);
  throw new Error('Unexpected shader expression: ' + node.type);
}

function shaderTokens(source) {
  const declarations = [];
  const body = source.replace(
    /(uniform|attribute|varying)\s+(\w+)\s+([^;]+);/g,
    (_, storage, type, names) => {
      declarations.push(
        ...names.split(',').map((name) => `${storage} ${type} ${name.trim()}`)
      );
      return '';
    }
  );
  return { declarations: declarations.sort(), body: body.replace(/\s+/g, '') };
}

async function baselineAudit() {
  const baseline = process.env.BASELINE_DIR;
  if (!baseline) return;
  const before = parsers.babel.parse(
    fs.readFileSync(path.join(baseline, 'runtime/fx.js'), 'utf8')
  );
  const after = parsers.babel.parse(
    fs.readFileSync(path.join(__dirname, 'src/fx.js'), 'utf8')
  );
  const shaders = {};
  let css;
  walk(before, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.name === 'CSS')
      css = literal(node.init);
    if (node.type === 'CallExpression' && node.callee.name === 'sh') {
      const name = node.arguments[1].property.name;
      shaders[name] = shaderTokens(literal(node.arguments[2]));
      node.callee.name = 'compileShader';
      node.arguments[2] = { type: 'Identifier', name };
    }
    if (node.type === 'FunctionDeclaration' && node.id.name === 'sh') {
      node.id.name = 'compileShader';
      walk(node.body, (child) => {
        if (child.type === 'Identifier')
          child.name =
            { gl: 'context', t: 'type', src: 'source', s: 'shader' }[
              child.name
            ] || child.name;
      });
      node.params.forEach(
        (param) =>
          (param.name =
            { gl: 'context', t: 'type', src: 'source' }[param.name] ||
            param.name)
      );
      const warning = node.body.body.find(
        (statement) => statement.type === 'IfStatement'
      );
      warning.consequent = {
        type: 'BlockStatement',
        body: [warning.consequent],
        directives: []
      };
    }
  });
  walk(after, (node) => {
    if (
      node.type === 'VariableDeclarator' &&
      ['VERTEX_SHADER', 'FRAGMENT_SHADER'].includes(node.id.name)
    ) {
      assert.deepEqual(
        shaderTokens(literal(node.init)),
        shaders[node.id.name],
        node.id.name + ': identical GLSL math and declarations'
      );
    }
    if (node.type === 'FunctionDeclaration' && node.id.name === 'createDom') {
      walk(node.body, (child) => {
        if (child.type === 'Identifier' && child.name === 'glass')
          child.name = 'g';
      });
    }
  });
  const expectedCSS = (
    await esbuild.transform(css, {
      loader: 'css',
      minify: true,
      legalComments: 'none'
    })
  ).code;
  const actualCSS = (
    await esbuild.transform(
      fs.readFileSync(path.join(__dirname, 'src/fx.css'), 'utf8'),
      { loader: 'css', minify: true, legalComments: 'none' }
    )
  ).code;
  assert.equal(
    actualCSS,
    expectedCSS,
    'FX CSS keeps exact rules, declarations, specificity and order'
  );
  const obsoleteSettings = new Set([
    'crtPower',
    'coldPowerLine',
    'powerSwitch',
    'idleOnEnter',
    'idleEnterDelay'
  ]);
  let idleEntryReferences = 0;
  walk(before, (node) => {
    if (node.type === 'Identifier' && node.name === 'idleGlitchNow')
      idleEntryReferences++;
  });
  assert.equal(
    idleEntryReferences,
    1,
    'Removed idle-entry helper had only its declaration, no callers or exports'
  );
  for (const ast of [before, after]) {
    walk(ast, (node) => {
      if (node.type === 'VariableDeclaration') {
        node.declarations = node.declarations.filter(
          (declaration) =>
            !['CSS', 'gim', 'VERTEX_SHADER', 'FRAGMENT_SHADER'].includes(
              declaration.id.name
            )
        );
      }
      if (node.type === 'ObjectExpression')
        node.properties = node.properties.filter(
          (property) => !obsoleteSettings.has(property.key?.name)
        );
      if (node.type === 'BlockStatement') {
        node.body = node.body.filter((statement) => {
          if (
            statement.type === 'VariableDeclaration' &&
            !statement.declarations.length
          )
            return false;
          if (
            statement.type === 'FunctionDeclaration' &&
            ['injectStyle', 'idleGlitchNow'].includes(statement.id.name)
          )
            return false;
          const expression = statement.expression;
          if (
            expression?.type === 'CallExpression' &&
            expression.callee.name === 'injectStyle'
          )
            return false;
          if (
            expression?.type === 'AssignmentExpression' &&
            expression.left.object?.name === 'S' &&
            obsoleteSettings.has(expression.left.property?.name)
          )
            return false;
          return true;
        });
      }
    });
  }
  for (const ast of [before, after])
    walk(ast, (node) => {
      if (node.type === 'BlockStatement')
        node.body = node.body.filter(
          (statement) =>
            !(
              statement.type === 'VariableDeclaration' &&
              !statement.declarations.length
            )
        );
    });
  assert.deepEqual(
    normalized(after),
    normalized(before),
    'FX JS changes are limited to extraction, local naming and dead compatibility'
  );
  const oldSite = parsers.babel.parse(
    fs.readFileSync(path.join(baseline, 'runtime/site.js'), 'utf8')
  );
  const newSite = parsers.babel.parse(
    fs.readFileSync(path.join(__dirname, 'src/site.js'), 'utf8')
  );
  walk(oldSite, (node) => {
    if (node.type === 'Identifier' && node.name === 'boot')
      node.name = 'initializeSite';
    if (node.type === 'BlockStatement')
      node.body = node.body.filter(
        (statement) =>
          !(
            statement.expression?.type === 'CallExpression' &&
            statement.expression.arguments.some(
              (argument) => argument.value === 'fx-boot'
            )
          )
      );
  });
  assert.deepEqual(
    normalized(newSite),
    normalized(oldSite),
    'Site JS changes are limited to gate removal and initialization naming'
  );
  console.log('Baseline AST, GLSL math and FX stylesheet-order audits passed');
}

(async () => {
  await baselineAudit();
  execFileSync(process.execPath, ['build.cjs'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  const first = hashes();
  execFileSync(process.execPath, ['build.cjs'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  assert.deepEqual(hashes(), first, 'Two builds must be byte-identical');
  for (const file of files(path.join(__dirname, 'dist'))) {
    assert(
      !/verification|node_modules|src\//.test(
        path.relative(path.join(__dirname, 'dist'), file)
      )
    );
    if (file.endsWith('.js')) execFileSync(process.execPath, ['--check', file]);
    if (file.endsWith('.html'))
      assert(
        !/fx-boot|coldStart|coldPowerLine|powerSwitch|idleOnEnter|idleEnterDelay|"coldMs"|"coldLine"|"crtPower"/.test(
          fs.readFileSync(file, 'utf8')
        )
      );
  }
  console.log(
    `Deterministic output: ${first.length} files; runtime syntax and gate/compatibility removal passed`
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
