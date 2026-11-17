"""Write the API contract to docs/openapi.json (run from backend/).

    python scripts/export_openapi.py

Frontend can then generate TypeScript types:  cd frontend && npm run gen:api-types
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

out = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"
out.write_text(json.dumps(app.openapi(), indent=2) + "\n")
print(f"wrote {out}")
