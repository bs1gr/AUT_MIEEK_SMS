import sys
from pathlib import Path
from backend import models
from backend.config import settings

# Ensure project root is on sys.path when running inside container
proj = Path("/app")
if str(proj) not in sys.path:
    sys.path.insert(0, str(proj))


engine = models.init_db(settings.DATABASE_URL)
models.Base.metadata.create_all(bind=engine)
print(
    "This helper script has been removed from the repository. It was used for local debugging only."
)
