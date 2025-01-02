# STEAM INTEGRATION GENERATOR

A Python-based application using the Google Gemini API to generate creative STEAM (Science, Technology, Engineering, Arts, Mathematics) integration ideas for lesson planning.

## Features

- **AI-Powered Ideas:** Generates STEAM integration ideas using the Google Gemini API
- **Multi-Language Output:** Supports output in both English and Nepali
- **Formatted Output:** Uses headings, subheadings, and italics for better readability
- **Export to DOCX:** Allows users to export generated ideas to a `.docx` file
- **Usage History:** Keeps a record of the last 5 uses
- **Custom UI:** A user-friendly GUI with a custom title bar

## Detailed Setup Guide

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/steam-integration-generator.git
   cd steam-integration-generator
   ```

2. **Create a virtual environment**

   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Google Gemini API**
   - Visit the [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create or log in to your Google account
   - Generate an API key
   - Copy the API key
   - Create a `.env` file in the project root
   - Add your API key: `GEMINI_API_KEY=your_api_key_here`

5. **Run the application**

   ```bash
   python main.py
   ```

### Quick Installation Option

If you have the dependencies installed and your API key ready, you can directly run the application by downloading and extracting the `.exe` file named 'STEAM' from [here](https://drive.google.com/file/d/1Iw6Fj8IQQYnAXmY1L-uvcQRS3QenjTMb/view?usp=sharing).

## Usage

1. Enter your topic, learning outcomes, and age group in the respective fields
2. Select your preferred language (English or Nepali)
3. Click generate to see the STEAM integration ideas
4. Use the export button to save to DOCX or clear button to reset

For a complete step-by-step guide, visit [the project wiki](https://github.com/everywhereattheendofscience/steam-integration-generator/wiki).

## Contributing

Contributions are welcome! See the project wiki for more information.

## License

MIT License
