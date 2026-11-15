"""The two in-memory caches can be shared between threads.

Endpoints behind the permission decorators run in worker threads beside the event loop (plan
todo 52), so the caches they use are read and written from several threads at once. Both
caches checked for a key and then read it, and evicted or expired entries with `del`: a
second thread in between meant a `KeyError`, and `delete_pattern` walked a dictionary that
another thread was adding to. Every operation now holds the cache's lock.
"""

import sys
import threading

import pytest

from backend.cache import TimedLRUCache
from backend.services.cache_service import InMemoryCache

THREADS = 8
ROUNDS = 4000


def _hammer(work) -> list[BaseException]:
    """Run ``work(thread_number)`` in several threads at once; return what they raised."""
    errors: list[BaseException] = []
    start = threading.Barrier(THREADS)

    def run(number: int) -> None:
        try:
            start.wait()
            work(number)
        except BaseException as exc:  # noqa: BLE001 - the test reports whatever a thread raised
            errors.append(exc)

    threads = [threading.Thread(target=run, args=(n,)) for n in range(THREADS)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=120)
    return errors


@pytest.fixture
def eager_thread_switching():
    """Make the interpreter switch threads as often as it can, so a race shows up quickly."""
    before = sys.getswitchinterval()
    sys.setswitchinterval(1e-6)
    yield
    sys.setswitchinterval(before)


def test_the_timed_lru_cache_survives_evictions_from_many_threads(eager_thread_switching):
    # Four slots and many more keys: almost every set evicts, and every thread wants the
    # same "least recently used" entry out.
    cache = TimedLRUCache(maxsize=4, ttl_seconds=300)

    def work(number: int) -> None:
        for i in range(ROUNDS):
            key = f"k{(i + number) % 16}"
            cache.set(key, i)
            cache.get(key)
            cache.get(f"k{i % 16}")

    assert _hammer(work) == []
    assert cache.stats()["size"] <= 4


def test_the_timed_lru_cache_survives_expiry_from_many_threads(eager_thread_switching):
    # Nothing lives: every get finds its entry expired and removes it, while other threads
    # remove and re-add the same keys.
    cache = TimedLRUCache(maxsize=64, ttl_seconds=-1)

    def work(number: int) -> None:
        for i in range(ROUNDS):
            key = f"k{i % 8}"
            cache.set(key, number)
            assert cache.get(key) is None

    assert _hammer(work) == []


def test_the_in_memory_cache_survives_pattern_deletes_from_many_threads(eager_thread_switching):
    cache = InMemoryCache(default_ttl=300)

    def work(number: int) -> None:
        for i in range(ROUNDS):
            cache.set(f"analytics:student:{i % 32}:summary", number)
            cache.get(f"analytics:student:{(i + number) % 32}:summary")
            if i % 5 == 0:
                cache.delete_pattern(f"analytics:student:{i % 32}:*")
            if i % 7 == 0:
                cache.delete(f"analytics:student:{(i + 1) % 32}:summary")

    assert _hammer(work) == []


def test_the_in_memory_cache_survives_expiry_from_many_threads(eager_thread_switching):
    cache = InMemoryCache(default_ttl=300)

    def work(number: int) -> None:
        for i in range(ROUNDS):
            key = f"k{i % 8}"
            cache.set(key, number, ttl=-1)  # already expired: the next get removes it
            assert cache.get(key) is None

    assert _hammer(work) == []


def test_both_caches_still_do_their_job():
    lru = TimedLRUCache(maxsize=2, ttl_seconds=300)
    lru.set("a", 1)
    lru.set("b", 2)
    assert lru.get("a") == 1  # "a" is now the more recently used
    lru.set("c", 3)  # evicts "b"
    assert (lru.get("a"), lru.get("b"), lru.get("c")) == (1, None, 3)
    lru.clear()
    assert lru.stats()["size"] == 0

    memory = InMemoryCache(default_ttl=300)
    memory.set("analytics:student:1:summary", "x")
    memory.set("analytics:course:1:summary", "y")
    memory.delete_pattern("analytics:student:*")
    assert memory.get("analytics:student:1:summary") is None
    assert memory.get("analytics:course:1:summary") == "y"
    memory.delete("analytics:course:1:summary")
    memory.delete("never-there")
    assert memory.get("analytics:course:1:summary") is None
