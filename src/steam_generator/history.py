"""The last few uses, kept in memory for the History menu."""
from __future__ import annotations

from collections import deque

MAX_ENTRIES = 5


class History:
    def __init__(self, maxlen: int = MAX_ENTRIES) -> None:
        self._entries: deque[str] = deque(maxlen=maxlen)

    def add(self, topic: str, outcomes: list[str], age_group: str, language: str) -> None:
        self._entries.append(f"Topic: {topic}, Outcomes: {', '.join(outcomes)}, Age: {age_group}, Lang: {language}")

    def entries(self) -> list[str]:
        """Oldest first."""
        return list(self._entries)
