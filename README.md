Required Libraries (Python Dependencies)
You will need to install the following Python libraries using pip (Python's package installer):

google-generativeai: For interacting with the Google Gemini API.

pip install google-generativeai

Use code with caution.
Bash
tkinter (usually comes with Python but may need installing separately): For creating the graphical user interface (GUI).

pip install tk

Bash
googletrans==4.0.0-rc1: For translating text between different languages (specifically for Nepali). This is an older version of the googletrans library, so make sure to install that specific version.

pip install googletrans==4.0.0-rc1

Use code with caution.
Bash
python-docx: For creating and exporting documents in the DOCX format.

pip install python-docx
Use code with caution.
Bash
collections

This is a standard library and you do not need to install it using pip.

How to Install:

Open your Terminal or Command Prompt.

Run the pip install commands one by one as shown above. If you have pip version 23.3 or above you will not have any problems installing these libraries using pip. If you have older version you may want to upgrade to the new version by running pip install --upgrade pip.

Ensure you are installing in the right environment:

Make sure that you are installing all these libraries in the right python environment.

If you are using venv then make sure the venv is activated before running the install commands.

Why These Libraries Are Needed:

google-generativeai: Connects your code with the Gemini API. This is needed for the AI part, to generate the STEAM integration ideas using the given input.

tkinter: Creates the graphical user interface (windows, labels, text input boxes, buttons etc.), allowing users to interact with your application.

googletrans: Provides the translation functionality to convert the output to other languages, specifically to Nepali.

python-docx: Allows you to create, modify, and save Microsoft Word documents in .docx format, which is needed for the export to docs feature.

collections : This module contains the deque function that is being used to store history. This is usually part of the standard python installation, so you do not need to explicitly install this using pip.

For Developers:

If you are using GitHub, then make sure to include the requirements in the requirements.txt file by using this command pip freeze > requirements.txt, so others can install the libraries required by the project using pip install -r requirements.txt.

Important Note:

Version Specifics: The version of the googletrans library is very important, so please install the version 4.0.0-rc1.

Environment: Make sure you install these in your desired Python environment, or use a virtual environment (venv) to manage your packages.

Internet Access: You need an active internet connection to install these libraries using pip. You also need internet connection to use the Gemini API.

Error: If the installation of any of these libraries is problematic, then try upgrading your pip using pip install --upgrade pip and try again.

By installing these dependencies, you will be able to run the application and test its functionalities without any problems. Let me know if you have further questions!
