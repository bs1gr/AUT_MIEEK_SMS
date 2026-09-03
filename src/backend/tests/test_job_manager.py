"""Tests for backend.services.job_manager.JobManager.

Previously untested. Covers the basic create/read/update/delete lifecycle
plus a regression test for the lost-update race in the job-list index: two
concurrent JobManager.create_job() calls used to be able to both read the
same list snapshot and have the second write clobber the first, silently
dropping an entry from list_jobs() even though the job itself still exists.
"""

import threading
import uuid

import pytest

from backend.schemas.jobs import JobCreate, JobResult, JobStatus, JobType
from backend.services import job_manager as job_manager_module
from backend.services.job_manager import JobManager


@pytest.fixture(autouse=True)
def isolated_job_list_keys(monkeypatch):
    """Give each test its own job-list keys so tests don't share global state
    via the process-wide redis_cache fallback singleton."""
    suffix = uuid.uuid4().hex
    monkeypatch.setattr(job_manager_module, "JOB_LIST_KEY", f"jobs:list:test:{suffix}")
    monkeypatch.setattr(job_manager_module, "USER_JOBS_KEY_PREFIX", f"jobs:user:test:{suffix}:")


def _make_job_create(user_id: int = 1) -> JobCreate:
    return JobCreate(job_type=JobType.STUDENT_IMPORT, user_id=user_id, priority=5, parameters={})


def test_create_and_get_job():
    job_id = JobManager.create_job(_make_job_create())

    job = JobManager.get_job(job_id)

    assert job is not None
    assert job.job_id == job_id
    assert job.status == JobStatus.PENDING


def test_get_job_returns_none_for_unknown_id():
    assert JobManager.get_job("does-not-exist") is None


def test_update_status_transitions_and_sets_timestamps():
    job_id = JobManager.create_job(_make_job_create())

    JobManager.update_status(job_id, JobStatus.PROCESSING)
    job = JobManager.get_job(job_id)
    assert job.status == JobStatus.PROCESSING
    assert job.started_at is not None

    JobManager.update_status(job_id, JobStatus.FAILED, error_message="boom")
    job = JobManager.get_job(job_id)
    assert job.status == JobStatus.FAILED
    assert job.completed_at is not None
    assert job.error_message == "boom"


def test_update_progress_auto_starts_pending_job():
    job_id = JobManager.create_job(_make_job_create())

    JobManager.update_progress(job_id, current=5, total=10, message="halfway")

    job = JobManager.get_job(job_id)
    assert job.status == JobStatus.PROCESSING
    assert job.progress.current == 5
    assert job.progress.total == 10
    assert job.progress.percentage == 50.0


def test_set_result_marks_completed_on_success():
    job_id = JobManager.create_job(_make_job_create())

    JobManager.set_result(
        job_id, JobResult(success=True, message="done", statistics={"processed": 3})
    )

    job = JobManager.get_job(job_id)
    assert job.status == JobStatus.COMPLETED
    assert job.result.statistics["processed"] == 3


def test_list_jobs_returns_newest_first():
    older = JobManager.create_job(_make_job_create())
    newer = JobManager.create_job(_make_job_create())

    jobs = JobManager.list_jobs()

    ids = [j.job_id for j in jobs]
    assert ids.index(newer) < ids.index(older)


def test_list_jobs_filters_by_user_id():
    JobManager.create_job(_make_job_create(user_id=1))
    other_user_job = JobManager.create_job(_make_job_create(user_id=2))

    jobs = JobManager.list_jobs(user_id=2)

    assert [j.job_id for j in jobs] == [other_user_job]


def test_cancel_job_marks_cancelled_when_pending():
    job_id = JobManager.create_job(_make_job_create())

    assert JobManager.cancel_job(job_id) is True
    assert JobManager.get_job(job_id).status == JobStatus.CANCELLED


def test_cancel_job_returns_false_once_completed():
    job_id = JobManager.create_job(_make_job_create())
    JobManager.set_result(job_id, JobResult(success=True, message="done"))

    assert JobManager.cancel_job(job_id) is False


def test_delete_job_removes_from_list_and_storage():
    job_id = JobManager.create_job(_make_job_create())

    assert JobManager.delete_job(job_id) is True
    assert JobManager.get_job(job_id) is None
    assert job_id not in [j.job_id for j in JobManager.list_jobs()]


def test_delete_job_returns_false_for_unknown_id():
    assert JobManager.delete_job("does-not-exist") is False


def test_concurrent_create_job_does_not_drop_list_entries():
    """Regression test for the job-list lost-update race.

    Before the _locked_job_list fix, concurrent create_job() calls could
    read-modify-write the same JOB_LIST_KEY snapshot and silently drop
    entries. Each job is still stored individually under its own key, so
    this asserts the aggregate index (used by list_jobs/pagination) doesn't
    lose any of them under concurrency.
    """
    thread_count = 20
    created_ids: list[str] = []
    lock = threading.Lock()

    def _create() -> None:
        job_id = JobManager.create_job(_make_job_create())
        with lock:
            created_ids.append(job_id)

    threads = [threading.Thread(target=_create) for _ in range(thread_count)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(created_ids) == thread_count
    listed = JobManager.list_jobs(limit=thread_count)
    listed_ids = {j.job_id for j in listed}
    assert listed_ids == set(created_ids)
