import json
import re
import os

with open('supabase_openapi.json') as f:
    openapi = json.load(f)

schema = {}
for name, defn in openapi.get('definitions', {}).items():
    cols = set(defn.get('properties', {}).keys())
    schema[name] = cols

target_dirs = ['lib/actions', 'lib/repositories', 'lib/services']
from_pattern = re.compile(r"\.from\(['\"]([a-zA-Z_][a-zA-Z0-9_]+)['\"]\)")
operation_pattern = re.compile(r"\.(insert|update|upsert)\(")
key_pattern = re.compile(r"['\"]?([a-zA-Z_][a-zA-Z0-9_]*)['\"]?\s*:")

def find_issues():
    issues = []
    for td in target_dirs:
        for root, _, files in os.walk(td):
            for fname in files:
                if not fname.endswith('.ts'):
                    continue
                fpath = os.path.join(root, fname)
                with open(fpath, 'r', encoding='utf-8') as f:
                    content = f.read()
                lines = content.splitlines()
                i = 0
                while i < len(lines):
                    line = lines[i]
                    m = from_pattern.search(line)
                    if not m:
                        i += 1
                        continue
                    table = m.group(1)
                    j = i
                    op_match = None
                    while j < len(lines) and j < i + 15:
                        op_match = operation_pattern.search(lines[j])
                        if op_match:
                            break
                        j += 1
                    if not op_match:
                        i += 1
                        continue
                    op = op_match.group(1)
                    start_col = lines[j].find(op + '(') + len(op) + 1
                    obj_text = lines[j][start_col:]
                    brace_depth = obj_text.count('{') - obj_text.count('}')
                    k = j + 1
                    while k < len(lines) and brace_depth > 0:
                        obj_text += '\n' + lines[k]
                        brace_depth += lines[k].count('{') - lines[k].count('}')
                        k += 1
                    obj_text = obj_text.strip()
                    if not obj_text.startswith('{'):
                        i = k if k > i else i + 1
                        continue
                    # crude cleanup
                    cleaned = re.sub(r'"(?:[^"\\]|\\.)*"', '""', obj_text)
                    cleaned = re.sub(r"'(?:[^'\\]|\\.)*'", "''", cleaned)
                    cleaned = re.sub(r'\b\.\.\.[a-zA-Z_][a-zA-Z0-9_]*\b', '', cleaned)
                    keys = set(key_pattern.findall(cleaned))
                    if table not in schema:
                        issues.append((fpath, i+1, table, None, f"Table '{table}' not found in live schema"))
                    else:
                        bad = [k for k in keys if k not in schema[table]]
                        for b in bad:
                            issues.append((fpath, i+1, table, b, f"Column '{b}' not found in table '{table}'"))
                    i = k if k > i else i + 1
    return issues

issues = find_issues()
seen = set()
for issue in issues:
    key = issue[:4]
    if key not in seen:
        seen.add(key)
        print(f"{issue[0]}:{issue[1]} | table={issue[2]} | col={issue[3]} | {issue[4]}")
