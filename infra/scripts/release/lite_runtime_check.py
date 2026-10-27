"""Runtime check for a running frozen SMS_Lite (plan todo 31).

Usage: python lite_runtime_check.py BASE_URL EMAIL PASSWORD

Exercises what a packaged Lite can get wrong that no unit test sees: the bundled SPA and
its assets, login against the seeded admin, Greek text through the API, and the PDF
exporters with the bundled DejaVu fonts (the v1.18.58 Lite shipped without them and
rendered Greek as black squares). Exit 0 only if every check passes.
"""

import io
import re
import sys
import time

import httpx
from pypdf import PdfReader

base, email, password = sys.argv[1].rstrip("/"), sys.argv[2], sys.argv[3]
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {detail}".rstrip(), flush=True)


with httpx.Client(base_url=base, timeout=60, follow_redirects=True) as c:
    r = c.get("/health")
    body = r.json() if r.status_code == 200 else {}
    db_status = (body.get("checks") or {}).get("database", {}).get("status")
    check("health", r.status_code == 200 and db_status == "healthy", f"status={body.get('status')} db={db_status}")

    r = c.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = r.json().get("access_token") if r.status_code == 200 else None
    check("login", bool(token), f"http={r.status_code}")
    h = {"Authorization": f"Bearer {token}", "Accept-Language": "el"}

    r = c.get("/api/v1/auth/me", headers=h)
    check("auth/me", r.status_code == 200 and r.json().get("email") == email, f"http={r.status_code}")

    sid = f"LITECHK{int(time.time())}"
    r = c.post(
        "/api/v1/students/",
        headers=h,
        json={"first_name": "Γιώργος", "last_name": "Παπαδόπουλος", "email": f"{sid.lower()}@example.com", "student_id": sid},
    )
    student = r.json() if r.status_code in (200, 201) else {}
    check("create student (Greek)", bool(student.get("id")), f"http={r.status_code} {'' if student else r.text[:200]}")

    r = c.post(
        "/api/v1/courses/",
        headers=h,
        json={"course_code": sid[-6:], "course_name": "Μαθηματικά", "semester": "Χειμερινό", "credits": 3},
    )
    course = r.json() if r.status_code in (200, 201) else {}
    check("create course (Greek)", bool(course.get("id")), f"http={r.status_code} {'' if course else r.text[:200]}")

    for name, path in [
        ("student report PDF", f"/api/v1/export/student-report/pdf/{student.get('id')}"),
        ("students list PDF", "/api/v1/export/students/pdf"),
    ]:
        r = c.get(path, headers=h)
        ok = r.status_code == 200 and r.content[:4] == b"%PDF"
        detail = f"http={r.status_code} bytes={len(r.content)}"
        if ok:
            reader = PdfReader(io.BytesIO(r.content))
            fonts: set[str] = set()
            for page in reader.pages:
                res = page.get("/Resources") or {}
                for f in (res.get("/Font") or {}).values():
                    fonts.add(str(f.get_object().get("/BaseFont")))
            text = "".join(p.extract_text() or "" for p in reader.pages)
            greek = bool(re.search("[Ͱ-Ͽ]", text))
            ok = greek and any("DejaVu" in f for f in fonts)
            detail += f" fonts={sorted(fonts)} greek_text={greek}"
        check(name, ok, detail)

    r = c.get("/api/v1/export/students/excel", headers=h)
    check("students Excel export", r.status_code == 200 and r.content[:2] == b"PK", f"http={r.status_code} bytes={len(r.content)}")

    if student.get("id"):
        r = c.delete(f"/api/v1/students/{student['id']}", headers=h)
        check("delete student", r.status_code in (200, 204), f"http={r.status_code}")

    r = c.get("/")
    check("SPA index", r.status_code == 200 and '<div id="root"' in r.text, f"http={r.status_code}")
    assets = re.findall(r'(?:src|href)="(/assets/[^"]+\.(?:js|css))"', r.text)
    bad = [a for a in assets if c.get(a).status_code != 200]
    check("SPA assets", bool(assets) and not bad, f"{len(assets)} referenced, failing={bad[:3]}")

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed" + (f"; FAILED: {failed}" if failed else ""), flush=True)
sys.exit(1 if failed else 0)
