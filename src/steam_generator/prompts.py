"""The prompts sent to Gemini.

The two templates (STEAM ideas, and a 5E lesson plan) are the original application's text. The only change is the optional
``language`` argument: instead of translating the English answer afterwards with an unofficial translation endpoint, the model
is asked to write in that language directly.
"""
from __future__ import annotations


def build_prompt(
    topic: str,
    learning_outcomes: list[str],
    age_group: str,
    output_type: str,
    time_minutes: int | None = None,
    location_name: str | None = None,
    language: str = "English",
) -> str:
    """Generates a prompt based on the input"""
    if output_type == "Ideas":
        prompt = f"""
            Develop a comprehensive and creative set of STEAM (Science, Technology, Engineering, Arts, Mathematics) integration possibilities
            for the topic: "{topic}" tailored exactly for learners of age {age_group} years. Make sure that the content is aligned with the cognitive abilities of the age group. The time for this activity should be about {time_minutes} minutes. Also provide examples from real world, so that the output is impactful and meaningful.

            The specified learning outcomes are:
            {', '.join(learning_outcomes)}.

            Provide a detailed description of how to creatively and reliably integrate each of the STEAM disciplines into this topic, emphasizing hands-on
            activities, interdisciplinary projects, and relevant thought-provoking discussions. Include examples and practical explanations that showcase the
            interconnectedness of these areas. Be creative but do not stary too far from the topic. Be realistic. Structure your output using clear headings, sub-headings, and bullet points where necessary, to make it easy to read.
            Use markdown style, for example, use **Heading** for headings and *italic* for italics.
            """
    else:
        prompt = f"""
           Create an optimized and relevant lesson plan for the topic: {topic}
            for learners who are {age_group}. The classroom session is {time_minutes} minutes long. Also give a brief context about the location that is being used in the output.

            The learning outcomes for this lesson are:
            {', '.join(learning_outcomes)}.
            
            **Location Context:**
            Location Name: {location_name}

            Given this context, generate a detailed lesson plan which follows the 5E model- Engage, Explore, Explain, Elaborate and Evaluate, which includes STEAM education related integrations.
            The lesson plan should include:

            *   **Title of the Lesson**
            *   **Learning Objectives** (Clearly restate the core learning outcomes, ensuring they are measurable and aligned with the desired knowledge, skills, and attitudes for students.)
             *  **Engage** (Design an activity that captures students' attention at the beginning of the lesson. This activity should activate prior knowledge and spark curiosity about the new topic.Consider using questions, hands-on activities, or a thought-provoking visual or story.)
            *   **Explore** (Develop an interactive and exploratory activity where students can engage directly with the content in a hands-on or experiential way. This phase should allow students to make observations, test hypotheses, or solve problems in a safe and supportive environment.)
            *  **Explain** (Present clear explanations to help students make sense of the new concepts or skills they have encountered during exploration. Incorporate student-led discussions, demonstrations, or real-life examples to deepen their understanding.)
            *   **Elaborate** (Create an extension activity that challenges students to apply their learning in new or real-world contexts. Encourage them to make connections to broader concepts, current events, or personal experiences. This phase should help them think critically and extend their knowledge beyond the lesson.)
            *  **Evaluate** (Describe an evaluation method to assess whether students have met the learning objectives. This could include formative assessments such as quizzes, presentations, reflections, or peer evaluations. Provide rubrics or criteria for evaluating student understanding.)
            *   **Materials Needed** (List all materials required for the activities in the lesson plan. Be specific and include any tools, technology, or resources that will support the lesson.)
            *   **Detailed Lesson Procedure** (Outline the steps for the lesson, providing timing estimates for each phase (Engage, Explore, Explain, Elaborate, Evaluate). Ensure the activities are well-paced and offer opportunities for student reflection and inquiry.)
            *   **STEAM Integration** (Explicitly describe how Science, Technology, Engineering, Arts, and Mathematics are interconnected within the activities. Highlight how each discipline is applied in creative and meaningful ways, ensuring the integration supports holistic learning and encourages cross-disciplinary thinking.)
            """
    if language.strip().lower() != "english":
        prompt += (
            f"\n\nWrite the entire response in {language}, keeping the same structure and the same "
            "**bold** and *italic* markers."
        )
    return prompt
