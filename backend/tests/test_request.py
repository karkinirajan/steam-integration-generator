import pytest

from app.core.request import DEFAULT_LOCATION, InputError, parse_outcomes, validate


def form(**over):
    values = dict(topic="Water cycle", outcomes_text="explain evaporation", age_group="10", output_type="Ideas",
                  time_text="", location="", language="English")
    values.update(over)
    return validate(**values)


class TestParseOutcomes:
    def test_splits_on_commas_and_trims(self):
        assert parse_outcomes("a, b ,c") == ["a", "b", "c"]

    @pytest.mark.parametrize("text", ["", "   ", ",", " , , ", ",,,"])
    def test_blank_input_has_no_outcomes(self, text):
        assert parse_outcomes(text) == []

    def test_trailing_and_doubled_commas_are_dropped(self):
        assert parse_outcomes("a,, b,") == ["a", "b"]

    def test_inner_spaces_are_kept(self):
        assert parse_outcomes("explain the water cycle, name three states") == ["explain the water cycle", "name three states"]


class TestRequiredFields:
    @pytest.mark.parametrize("field", ["topic", "outcomes_text", "age_group"])
    @pytest.mark.parametrize("blank", ["", "   "])
    def test_each_field_is_required(self, field, blank):
        with pytest.raises(InputError, match="fill in all fields"):
            form(**{field: blank})

    def test_outcomes_of_only_commas_count_as_empty(self):
        # "".split(",") is [""], which is truthy: the old check let this through
        with pytest.raises(InputError, match="fill in all fields"):
            form(outcomes_text=" , , ")

    def test_values_are_trimmed(self):
        request = form(topic="  Water  ", age_group=" 10 ", outcomes_text=" a , b ")
        assert (request.topic, request.age_group, request.outcomes) == ("Water", "10", ["a", "b"])


class TestChoices:
    def test_an_unknown_output_type_is_refused(self):
        with pytest.raises(InputError, match="output type"):
            form(output_type="Poem")

    def test_an_unknown_language_is_refused(self):
        with pytest.raises(InputError, match="language"):
            form(language="Klingon")

    @pytest.mark.parametrize("output_type", ["Ideas", "Lesson Plan"])
    @pytest.mark.parametrize("language", ["English", "Nepali"])
    def test_every_offered_combination_is_accepted(self, output_type, language):
        assert form(output_type=output_type, language=language, time_text="40").language == language


class TestClassTime:
    def test_ideas_do_not_need_a_time(self):
        assert form(output_type="Ideas", time_text="").time_minutes is None

    def test_ideas_ignore_a_time_that_is_not_a_number(self):
        assert form(output_type="Ideas", time_text="soon").time_minutes is None

    def test_a_lesson_plan_needs_a_time(self):
        with pytest.raises(InputError, match="class time"):
            form(output_type="Lesson Plan", time_text="  ")

    @pytest.mark.parametrize("text", ["abc", "4.5", "1e2", "forty"])
    def test_a_lesson_plan_needs_a_whole_number(self, text):
        with pytest.raises(InputError, match="valid integer"):
            form(output_type="Lesson Plan", time_text=text)

    @pytest.mark.parametrize("text", ["0", "-5"])
    def test_a_lesson_plan_needs_a_positive_time(self, text):
        with pytest.raises(InputError, match="greater than zero"):
            form(output_type="Lesson Plan", time_text=text)

    def test_a_good_time_is_parsed_and_trimmed(self):
        assert form(output_type="Lesson Plan", time_text=" 45 ").time_minutes == 45


class TestLocation:
    def test_a_blank_location_gets_a_default(self):
        assert form(location="  ").location == DEFAULT_LOCATION

    def test_a_given_location_is_kept_and_trimmed(self):
        assert form(location=" Pokhara ").location == "Pokhara"


def test_a_request_is_immutable():
    request = form()
    with pytest.raises(AttributeError):
        request.topic = "other"  # type: ignore[misc]
