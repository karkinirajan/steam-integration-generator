from steam_generator.history import MAX_ENTRIES, History


def test_it_starts_empty():
    assert History().entries() == []


def test_an_entry_is_formatted_with_every_field():
    history = History()
    history.add("Water", ["a", "b"], "10", "Nepali")
    assert history.entries() == ["Topic: Water, Outcomes: a, b, Age: 10, Lang: Nepali"]


def test_only_the_last_five_are_kept_oldest_first():
    history = History()
    for n in range(8):
        history.add(f"t{n}", ["o"], "9", "English")
    assert MAX_ENTRIES == 5
    assert [entry.split(",")[0] for entry in history.entries()] == [f"Topic: t{n}" for n in range(3, 8)]


def test_the_limit_can_be_changed():
    history = History(maxlen=2)
    for n in range(4):
        history.add(f"t{n}", [], "9", "English")
    assert len(history.entries()) == 2


def test_entries_returns_a_copy():
    history = History()
    history.add("t", [], "9", "English")
    history.entries().clear()
    assert len(history.entries()) == 1
