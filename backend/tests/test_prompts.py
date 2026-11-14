from app.core.prompts import build_prompt


def ideas(**over):
    args = dict(topic="Water cycle", learning_outcomes=["explain evaporation", "draw a diagram"], age_group="10",
                output_type="Ideas")
    args.update(over)
    return build_prompt(**args)


def lesson(**over):
    args = dict(topic="Water cycle", learning_outcomes=["explain evaporation"], age_group="10 years",
                output_type="Lesson Plan", time_minutes=45, location_name="Pokhara")
    args.update(over)
    return build_prompt(**args)


class TestIdeas:
    def test_it_names_the_topic_age_and_every_outcome(self):
        text = ideas()
        assert '"Water cycle"' in text and "age 10 years" in text
        assert "explain evaporation, draw a diagram" in text

    def test_it_is_the_ideas_template_not_the_lesson_plan(self):
        text = ideas()
        assert "integration possibilities" in text
        assert "5E model" not in text

    def test_text_that_looks_like_formatting_is_kept_as_typed(self):
        assert '{curly} "quoted" <tag>' in ideas(topic='{curly} "quoted" <tag>')


class TestLessonPlan:
    def test_it_is_the_5e_template(self):
        text = lesson()
        assert "5E model" in text
        for phase in ("Engage", "Explore", "Explain", "Elaborate", "Evaluate"):
            assert f"**{phase}**" in text

    def test_it_names_the_time_location_and_outcomes(self):
        text = lesson()
        assert "45 minutes long" in text and "Location Name: Pokhara" in text
        assert "explain evaporation." in text

    def test_a_different_time_changes_the_prompt(self):
        assert "90 minutes long" in lesson(time_minutes=90)


class TestLanguage:
    def test_english_adds_no_instruction(self):
        assert "Write the entire response in" not in ideas()
        assert "Write the entire response in" not in ideas(language="English")

    def test_english_is_matched_without_regard_to_case_or_spaces(self):
        assert "Write the entire response in" not in ideas(language=" english ")

    def test_another_language_is_asked_for_directly(self):
        text = ideas(language="Nepali")
        assert "Write the entire response in Nepali" in text
        assert "**bold**" in text and "*italic*" in text

    def test_the_instruction_comes_last_so_it_is_not_buried(self):
        assert ideas(language="Nepali").rstrip().endswith("*italic* markers.")

    def test_the_instruction_is_added_to_the_prompt_not_put_in_its_place(self):
        text = ideas(language="Nepali")
        assert '"Water cycle"' in text and "integration possibilities" in text and "explain evaporation" in text
        assert len(text) > len(ideas()) + 40

    def test_it_applies_to_a_lesson_plan_too(self):
        assert "Write the entire response in Nepali" in lesson(language="Nepali")
