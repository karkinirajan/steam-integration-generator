document.addEventListener('DOMContentLoaded', () => {
 document.getElementById('generate-button').addEventListener('click', generateSTEAM);
 document.getElementById('clear-button').addEventListener('click', clearAll);
 document.getElementById('export-button').addEventListener('click', exportText);
 document.getElementById('about-button').addEventListener('click', showAbout);
 document.getElementById('change-api-button').addEventListener('click', changeAPIKey);
 document.getElementById('api-key').addEventListener('input', hideApiKeyError); // Add listener to clear API key error on input

 // --- Dark/Light Mode Toggle ---
 const toggleModeButton = document.getElementById('toggle-mode-button');
 const bodyElement = document.body;
 let darkMode = false;

 toggleModeButton.addEventListener('click', () => {
 darkMode = !darkMode;
 bodyElement.classList.toggle('dark-mode');
 toggleModeButton.textContent = darkMode ? 'Light Mode' : 'Dark Mode';
 });
});

// --- Input Validation Error Display ---
function displayInputError(fieldId, message) {
 const field = document.getElementById(fieldId);
 field.classList.add('input-error'); // Add class to input for error styling if needed
 alert(message); // For simplicity, using alert for errors. Consider a better UI for real app.
}

// --- API Key Error Handling ---
function displayApiKeyError() {
 const apiKeyInput = document.getElementById('api-key');
 apiKeyInput.classList.add('input-error'); // Style API key input if needed
 alert('Please enter your Gemini API Key to generate STEAM ideas.');
}

function hideApiKeyError() {
 const apiKeyInput = document.getElementById('api-key');
 apiKeyInput.classList.remove('input-error'); // Remove error styling when user starts typing
}


async function generateSTEAM() {
 const apiKey = document.getElementById('api-key').value.trim();
 if (!apiKey) {
 displayApiKeyError(); // Use dedicated function for API key error
 return;
 }

 const topic = document.getElementById('topic').value.trim();
 const outcomes = document.getElementById('outcomes').value.trim().split(',').map(o => o.trim()).filter(o => o); // Filter out empty outcomes
 const ageGroup = document.getElementById('age-group').value.trim();
 const outputType = document.getElementById('output-type').value;
 const timeMinutes = document.getElementById('time-minutes').value.trim();
 const locationName = document.getElementById('location-name').value.trim();
 // Language is now fixed to English - no need to get it from the UI

 // --- Input Validation --- (More specific checks)
 if (!topic) {
 displayInputError('topic', 'Please enter a Topic.');
 return;
 }
 if (outcomes.length === 0 || outcomes[0] === "") { // Check for empty outcomes array
 displayInputError('outcomes', 'Please enter at least one Learning Outcome.');
 return;
 }
 if (!ageGroup || isNaN(ageGroup)) {
 displayInputError('age-group', 'Please enter a valid Age Group (e.g., 10-12, or just a number).');
 return;
 }
 if (!timeMinutes || isNaN(timeMinutes) || parseInt(timeMinutes) <= 0) {
 displayInputError('time-minutes', 'Please enter a valid Class Time in minutes (a positive number).');
 return;
 }


 // --- Show Loading State ---
 document.getElementById('generate-button').disabled = true;
 document.getElementById('generate-button').textContent = 'Generating...';
 document.getElementById('loading-overlay').style.display = 'flex'; // Display overlay when loading
 document.getElementById('output-text').textContent = ''; // Clear previous output


 const prompt = generatePrompt(topic, outcomes, ageGroup, outputType, timeMinutes, locationName);
 let generatedText = "";
 try {
 generatedText = await callGeminiAPI(apiKey, prompt);
 } catch (apiError) {
 console.error("API Call Failed:", apiError);
 generatedText = `Error generating STEAM ideas. Please check the console for details.`; // User-friendly error
 }


 // No translation needed anymore - always English

 // --- Markdown to HTML Conversion ---
 let formattedText = generatedText;
 formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Bold
 formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>'); // Italic
 formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>'); // Code blocks
 formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>'); // Inline code
 formattedText = formattedText.replace(/---/g, '<hr>'); // Horizontal rule
 formattedText = formattedText.replace(/\n/g, '<br>'); // New lines to <br> for HTML


 document.getElementById('output-text').innerHTML = formattedText; // Set formatted HTML output
 document.getElementById('generate-button').textContent = 'Generate';
 document.getElementById('generate-button').disabled = false;
 document.getElementById('loading-overlay').style.display = 'none'; // Hide loading overlay
}

function generatePrompt(topic, learningOutcomes, ageGroup, outputType, timeMinutes, locationName) {
 const outcomesList = learningOutcomes.map(outcome => `- ${outcome}`).join('\n'); // Format outcomes as bullet list for prompt clarity

 if (outputType === 'Ideas') {
 return `
**Task:** Generate highly creative and practical STEAM (Science, Technology, Engineering, Arts, and Mathematics) integration ideas.

**Topic:** "${topic}"
**Target Learners:** Age ${ageGroup} years
**Activity Duration:** Approximately ${timeMinutes} minutes
**Learning Outcomes:**
${outcomesList}

**Instructions:**

You are an expert in STEAM education and curriculum design. Your goal is to develop a comprehensive and engaging set of STEAM integration ideas specifically for the topic "${topic}" and learners of age ${ageGroup}.

The generated ideas should be:

* **Creative and Innovative:** Think outside the box and propose novel approaches to STEAM integration.
* **Practical and Realistic:** Ideas should be feasible to implement in a classroom or learning environment with typical resources.
* **Age-Appropriate:** Content and complexity must be suitable for the cognitive abilities of ${ageGroup}-year-old learners.
* **Comprehensive:** Cover a range of integration possibilities, ideally touching upon each of the STEAM disciplines (Science, Technology, Engineering, Arts, and Mathematics) in meaningful ways.
* **Impactful and Meaningful:** The ideas should connect the topic to real-world contexts and make learning engaging and memorable for students.
* **Actionable:** Provide enough detail so that an educator can understand and potentially implement the ideas.

**Output Format:**

Structure your output in Markdown format for clear readability. Use headings, sub-head ings, and bullet points where necessary, to make it easy to read. **Language:** English.
 `;
 } else { // Lesson Plan
 return `
**Task:** Create a detailed and optimized Lesson Plan following the 5E Model for STEAM Education.

**Topic:** "${topic}"
**Target Learners:** Age ${ageGroup} years
**Session Duration:** ${timeMinutes} minutes
**Location Context:** ${locationName || 'General Classroom Setting'}
**Learning Outcomes:**
${outcomesList}

**Instructions:**

You are an experienced educator specializing in STEAM curriculum design and the 5E instructional model (Engage, Explore, Explain, Elaborate, Evaluate). Your task is to create a highly effective and engaging lesson plan for the topic "${topic}" tailored for ${ageGroup}-year-old learners.

The Lesson Plan must adhere to the 5E model and should:

* **Engage:** Start with an activity that immediately captures students' attention, activates prior knowledge, and sparks curiosity about "${topic}".
* **Explore:** Develop an hands-on, interactive exploratory activity that allows students to directly investigate "${topic}".
* **Explain:** Provide clear and concise explanations of the concepts or skills explored.
* **Elaborate:** Design an extension activity that challenges students to apply their new knowledge and skills in a novel or real-world context.
* **Evaluate:** Specify a method for evaluating student learning and assessing whether the learning outcomes have been met.

**STEAM Integration:** Explicitly integrate STEAM principles and activities throughout each phase of the 5E model.

**Practical Details:**

* **Materials Needed:** List all materials and resources required for the lesson.
* **Detailed Procedure:** Provide a step-by-step procedure for the entire lesson, including time estimates for each phase.

**Output Format:**

Structure the Lesson Plan clearly in Markdown format using the 5E headings (Engage, Explore, Explain, Elaborate, Evaluate). **Language:** English.
 `;
 }
}

async function callGeminiAPI(apiKey, prompt) {
 const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
 const headers = {
 'Content-Type': 'application/json'
 };
 const data = {
 'contents': [{
 'parts': [{ 'text': prompt }]
 }]
 };

 try {
 const response = await fetch(url, {
 method: 'POST',
 headers: headers,
 body: JSON.stringify(data)
 });

 if (!response.ok) {
 const errorData = await response.json();
 console.error('API Error:', errorData);
 throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error.message}`);
 }

 const responseData = await response.json();
 if (responseData.candidates && responseData.candidates[0].content && responseData.candidates[0].content.parts && responseData.candidates[0].content.parts[0].text) {
 return responseData.candidates[0].content.parts[0].text;
 } else {
 console.warn('Unexpected API response format:', responseData);
 return 'Error: Could not extract text from API response.';
 }
 } catch (error) {
 console.error('Error calling Gemini API:', error);
 return `Error generating STEAM ideas: ${error.message}`;
 }
}

function clearAll() {
 document.getElementById('topic').value = '';
 document.getElementById('outcomes').value = '';
 document.getElementById('age-group').value = '';
 document.getElementById('output-text').textContent = '';
 document.getElementById('time-minutes').value = '';
 document.getElementById('location-name').value = '';
 hideApiKeyError(); // Clear any API key error styling
 const inputs = document.querySelectorAll('.input-panel input.input-error, .input-panel select.input-error, .input-panel textarea.input-error');
 inputs.forEach(input => input.classList.remove('input-error')); // Clear all input errors
}

function exportText() {
 const textToExport = document.getElementById('output-text').textContent;
 if (!textToExport) {
 alert('No text to export.');
 return;
 }

 const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const downloadLink = document.createElement('a');
 downloadLink.href = url;
 downloadLink.download = 'steam_ideas.txt';
 document.body.appendChild(downloadLink);
 downloadLink.click(); // Programmatically trigger download
 document.body.removeChild(downloadLink);
 URL.revokeObjectURL(url); // Clean up URL object
}

function showAbout() {
 alert('STEAM Integration Generator (HTML/JS)\nCreated by Rajat using Gemini AI.\n\nNote: API key is stored in browser memory only and is not persisted across sessions.\nOutput language is set to English.');
}

function changeAPIKey() {
 const newApiKey = prompt("Enter your new Gemini API Key:");
 if (newApiKey !== null) {
 document.getElementById('api-key').value = newApiKey;
 hideApiKeyError(); // Clear API key error if key is changed
 alert("API Key Changed (but not persistently stored).");
 }
}
