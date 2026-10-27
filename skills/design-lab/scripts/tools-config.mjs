const oldServers = {
  design_lab_shadcn: ['-y', 'shadcn@4.23.0', 'mcp'],
  design_lab_magicui: ['-y', '@magicuidesign/mcp@2.0.0'],
};
const current = { command: 'node', args: ['.agents/skills/design-lab/scripts/mcp.mjs'], cwd: '..', startup_timeout_sec: 150, tool_timeout_sec: 120 };

function withoutComment(value) {
  let quote = ''; let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) { escaped = false; continue; }
    if (quote === '"' && char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; }
    else if (char === '"' || char === "'") quote = char;
    else if (char === '#') return value.slice(0, index);
  }
  return value;
}
function values(body) {
  const output = {};
  for (const raw of body.split('\n')) {
    const line = withoutComment(raw).trim(); if (!line) continue;
    const match = line.match(/^([a-z_]+)\s*=\s*(.+)$/i);
    if (!match || match[1] in output) throw new Error('Unsupported or duplicate managed MCP setting.');
    try { output[match[1]] = match[2].startsWith("'") && match[2].endsWith("'") ? match[2].slice(1, -1) : JSON.parse(match[2]); }
    catch { throw new Error('Unsupported managed MCP value. Preserve custom server settings explicitly.'); }
  }
  return output;
}
const equal = (left, right) => JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());

export function updateToolConfig(original) {
  const sections = [...original.matchAll(/^\s*\[([^\]\n]+)\]\s*(?:#[^\n]*)?$/gm)];
  const removals = []; const seen = new Set(); let installed = false;
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const named = section[1].match(/^mcp_servers\.(?:([a-z_]+)|"([a-z_]+)"|'([a-z_]+)')$/i);
    const name = named && (named[1] || named[2] || named[3]);
    if (name !== 'design_lab' && !(name in oldServers)) continue;
    if (seen.has(name)) throw new Error(`MCP configuration conflict: duplicate ${name} table.`);
    seen.add(name);
    const end = sections[index + 1]?.index ?? original.length;
    let parsed;
    try { parsed = values(original.slice(section.index + section[0].length, end)); }
    catch (error) { throw new Error(`MCP configuration conflict for ${name}: ${error.message}`); }
    if (name === 'design_lab') {
      if (!equal(parsed, current)) throw new Error('MCP configuration conflict for design_lab; existing custom settings are preserved.');
      installed = true;
    } else {
      const linux = { command: 'npx', args: oldServers[name] };
      const windows = { command: 'cmd.exe', args: ['/d', '/c', 'npx', ...oldServers[name]] };
      if (!equal(parsed, linux) && !equal(parsed, windows)) throw new Error(`MCP configuration conflict for ${name}; existing custom settings are preserved.`);
      removals.push([section.index, end]);
    }
  }
  for (const name of ['design_lab', ...Object.keys(oldServers)]) {
    if (!seen.has(name) && new RegExp(`^\\s*(?:mcp_servers\\.${name}\\s*=|${name}\\s*=|\\[mcp_servers\\.${name}\\.)`, 'm').test(original)) throw new Error(`MCP configuration conflict for ${name}; unsupported existing TOML form.`);
  }
  let result = original;
  for (const [start, end] of removals.reverse()) result = result.slice(0, start) + result.slice(end);
  if (!installed) result += `${result && !result.endsWith('\n') ? '\n' : ''}\n[mcp_servers.design_lab]\n${Object.entries(current).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n')}\n`;
  return result;
}
