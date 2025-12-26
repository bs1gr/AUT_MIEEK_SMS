import re

with open("COMMIT_READY.ps1", "rb") as f:
    s = f.read().decode("utf-8", "replace")
L = len(s)
errors = []
# find all try occurrences
for m in re.finditer(r"\btry\s*\{", s):
    start = m.start()
    # find end of this block by scanning braces
    i = m.end() - 1
    depth = 0
    while i < L:
        c = s[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
        i += 1
    else:
        errors.append((start, "no matching closing brace"))
        continue
    # after end, skip whitespace
    j = end + 1
    while j < L and s[j].isspace():
        j += 1
    # check if next token is catch or finally
    next_token = re.match(r"(catch|finally)\b", s[j:])
    if not next_token:
        # get context
        ctx = s[end - 40 : end + 40].replace("\n", "\\n")
        errors.append((start, "missing catch/finally after try-block", ctx))

if not errors:
    print("OK: all try blocks followed by catch or finally")
else:
    print("FOUND", len(errors), "problems")
    for e in errors[:20]:
        print(e[0], e[1])
        if len(e) > 2:
            print("CTX:", e[2])
