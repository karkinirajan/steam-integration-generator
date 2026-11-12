"""The desktop window (Tkinter). Everything that can be tested without a display lives in the other modules."""
from __future__ import annotations

import queue
import threading
import tkinter as tk
from collections.abc import Callable
from tkinter import filedialog, messagebox, scrolledtext, ttk

from steam_generator.config import LANGUAGES, OUTPUT_TYPES, api_key_from_env, looks_like_api_key
from steam_generator.exports import pdf_can_render, write_docx, write_pdf
from steam_generator.gemini import GeminiService, GenerationError
from steam_generator.history import History
from steam_generator.markup import Line, parse
from steam_generator.prompts import build_prompt
from steam_generator.request import InputError, Request, validate

POLL_MS = 100
ABOUT_TEXT = (
    "STEAM Integration Generator\nCreated by Rajat using Gemini AI.\nhttps://github.com/rajat-ed/steam-integration-generator"
)
BACKGROUND = "#f0f0f0"


def ask_api_key(parent: tk.Misc, title: str, initial: str = "") -> str | None:
    """Ask for the API key in a modal dialog of ``parent``. Returns the key, or None if the person cancelled."""
    dialog = tk.Toplevel(parent)
    dialog.title(title)
    dialog.geometry("420x190")
    answer: list[str | None] = [None]

    ttk.Label(dialog, text="Enter your Gemini API key:").pack(pady=10)
    entry = ttk.Entry(dialog, width=50, show="*")
    entry.insert(0, initial)
    entry.pack(pady=5)
    entry.focus_set()
    show = tk.BooleanVar(value=False)
    def toggle() -> None:
        entry.config(show="" if show.get() else "*")

    ttk.Checkbutton(dialog, text="Show key", variable=show, command=toggle).pack(pady=5)

    def submit(_event: object = None) -> None:
        key = entry.get().strip()
        if looks_like_api_key(key):
            answer[0] = key
            dialog.destroy()
        else:
            message = "That does not look like an API key. Paste the whole key, without spaces."
            messagebox.showerror("Error", message, parent=dialog)

    buttons = ttk.Frame(dialog)
    buttons.pack(pady=10)
    ttk.Button(buttons, text="Submit", command=submit).grid(row=0, column=0, padx=5)
    ttk.Button(buttons, text="Cancel", command=dialog.destroy).grid(row=0, column=1, padx=5)
    dialog.bind("<Return>", submit)
    dialog.protocol("WM_DELETE_WINDOW", dialog.destroy)
    dialog.grab_set()
    parent.wait_window(dialog)
    return answer[0]


def _focus(widget: tk.Misc) -> Callable[[object], None]:
    def handler(_event: object) -> None:
        widget.focus_set()

    return handler


class SteamApp:
    def __init__(self, window: tk.Tk, api_key: str) -> None:
        self.window = window
        self.service = GeminiService(api_key)
        self.history = History()
        self.markdown = ""  # the last response exactly as returned: exports use this, not the displayed text
        self._results: queue.Queue[tuple[Request, str | None, str | None]] = queue.Queue()

        window.title("STEAM Integration Generator")
        window.geometry("1000x750")
        window.configure(bg=BACKGROUND)
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TLabel", font=("Helvetica", 11), background=BACKGROUND)
        style.configure("TButton", font=("Helvetica", 11), padding=5)
        style.configure("TCombobox", font=("Helvetica", 11))
        style.configure("TEntry", font=("Helvetica", 11))

        self.output_type = tk.StringVar(value=OUTPUT_TYPES[0])
        self.language = tk.StringVar(value=LANGUAGES[0])
        self.export_format = tk.StringVar(value="DOCX")
        self._build_form()
        self._build_buttons()
        self._build_output()
        self._build_menu()

    # ---- layout -------------------------------------------------------------------------------------------------------

    def _build_form(self) -> None:
        def entry(row: int, label: str) -> ttk.Entry:
            ttk.Label(self.window, text=label).grid(row=row, column=0, sticky="w", padx=10, pady=5)
            widget = ttk.Entry(self.window, width=80, style="TEntry")
            widget.grid(row=row, column=1, padx=10, pady=5)
            return widget

        def combo(row: int, label: str, variable: tk.StringVar, values: tuple[str, ...]) -> ttk.Combobox:
            ttk.Label(self.window, text=label).grid(row=row, column=0, sticky="w", padx=10, pady=5)
            widget = ttk.Combobox(self.window, textvariable=variable, values=values, style="TCombobox")
            widget.grid(row=row, column=1, padx=10, pady=5)
            return widget

        self.topic = entry(0, "Topic:")
        self.outcomes = entry(1, "Learning Outcomes (comma separated):")
        self.age = entry(2, "Age Group:")
        self.output_box = combo(3, "Output Type:", self.output_type, OUTPUT_TYPES)
        self.time = entry(4, "Class Time (minutes, for a lesson plan):")
        self.location = entry(5, "Location Name:")
        self.language_box = combo(6, "Language:", self.language, LANGUAGES)

    def _build_buttons(self) -> None:
        frame = ttk.Frame(self.window, padding=10)
        frame.grid(row=7, column=0, columnspan=2, pady=10)
        self.generate_button = ttk.Button(frame, text="Generate STEAM Ideas", command=self.generate, style="TButton")
        self.generate_button.grid(row=0, column=0, padx=5)
        ttk.Button(frame, text="Clear All", command=self.clear_all, style="TButton").grid(row=0, column=1, padx=5)
        ttk.Label(frame, text="Export Format:").grid(row=0, column=2, padx=5)
        formats = ttk.Combobox(frame, textvariable=self.export_format, values=["DOCX", "PDF"], state="readonly", width=10)
        formats.grid(row=0, column=3, padx=5)
        ttk.Button(frame, text="Export Document", command=self.export_document, style="TButton").grid(row=0, column=4, padx=5)

        # Enter moves to the next field; on the last one it generates. (It used to call focus_set() on a StringVar, which raised.)
        chain = [
            self.topic, self.outcomes, self.age, self.output_box,
            self.time, self.location, self.language_box, self.generate_button,
        ]
        for current, following in zip(chain, chain[1:], strict=False):  # pairs: each field and the one after it
            current.bind("<Return>", _focus(following))

    def _build_output(self) -> None:
        box = scrolledtext.ScrolledText(self.window, wrap=tk.WORD, width=120, height=20, font=("Helvetica", 11))
        box.grid(row=8, column=0, columnspan=2, padx=10, pady=10)
        box.tag_config("h1", font=("Helvetica", 14, "bold"))
        box.tag_config("h2", font=("Helvetica", 12, "bold"))
        box.tag_config("bold", font=("Helvetica", 11, "bold"))
        box.tag_config("italic", font=("Helvetica", 11, "italic"))
        box.tag_config("bolditalic", font=("Helvetica", 11, "bold italic"))
        box.config(state=tk.DISABLED)
        self.output_text = box

    def _build_menu(self) -> None:
        bar = tk.Menu(self.window)
        self.window.config(menu=bar)
        for label, entry_label, command in (
            ("API", "Change API Key", self.change_api_key),
            ("History", "History", self.show_history),
            ("About", "About", self.show_about),
        ):
            menu = tk.Menu(bar, tearoff=0)
            menu.add_command(label=entry_label, command=command)
            bar.add_cascade(label=label, menu=menu)

    # ---- actions ------------------------------------------------------------------------------------------------------

    def generate(self) -> None:
        try:
            request = validate(
                self.topic.get(), self.outcomes.get(), self.age.get(), self.output_type.get(),
                self.time.get(), self.location.get(), self.language.get(),
            )
        except InputError as exc:
            messagebox.showerror("Error", str(exc))
            return
        prompt = build_prompt(
            request.topic, request.outcomes, request.age_group, request.output_type,
            request.time_minutes, request.location, request.language,
        )
        self.generate_button.config(text="Generating, Please Wait...", state=tk.DISABLED)
        threading.Thread(target=self._worker, args=(request, prompt), daemon=True).start()
        self.window.after(POLL_MS, self._poll)

    def _worker(self, request: Request, prompt: str) -> None:
        """Runs off the main thread, so it only calls Gemini and queues the outcome: no Tk calls here."""
        try:
            self._results.put((request, self.service.generate(prompt), None))
        except GenerationError as exc:
            self._results.put((request, None, str(exc)))

    def _poll(self) -> None:
        try:
            request, text, error = self._results.get_nowait()
        except queue.Empty:
            self.window.after(POLL_MS, self._poll)
            return
        self.generate_button.config(text="Generate STEAM Ideas", state=tk.NORMAL)
        if error is not None or text is None:
            messagebox.showerror("Error", error or "No response.")
            return
        self.markdown = text
        self._show(parse(text))
        self.history.add(request.topic, request.outcomes, request.age_group, request.language)

    def _show(self, lines: list[Line]) -> None:
        box = self.output_text
        box.config(state=tk.NORMAL)
        box.delete("1.0", tk.END)
        for line in lines:
            if line.kind == "bullet":
                box.insert(tk.END, "• ")
            for run in line.runs:
                if line.kind == "heading":
                    tag = f"h{line.level}"
                else:
                    tag = "bolditalic" if run.bold and run.italic else "bold" if run.bold else "italic" if run.italic else ""
                box.insert(tk.END, run.text, tag)
            box.insert(tk.END, "\n")
        box.config(state=tk.DISABLED)

    def clear_all(self) -> None:
        for entry in (self.topic, self.outcomes, self.age, self.time, self.location):
            entry.delete(0, tk.END)
        self.markdown = ""
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete("1.0", tk.END)
        self.output_text.config(state=tk.DISABLED)

    def export_document(self) -> None:
        if not self.markdown:
            messagebox.showwarning("Warning", "No STEAM ideas to export.")
            return
        as_pdf = self.export_format.get() == "PDF"
        if as_pdf and not pdf_can_render(self.markdown):
            messagebox.showwarning("PDF not available", "A PDF cannot show this language's letters. Export as DOCX instead.")
            return
        extension, kind = (".pdf", "PDF Document") if as_pdf else (".docx", "Word Document")
        path = filedialog.asksaveasfilename(defaultextension=extension, filetypes=[(kind, f"*{extension}")])
        if not path:
            return
        try:
            (write_pdf if as_pdf else write_docx)(self.markdown, path)
        except OSError as exc:
            messagebox.showerror("Error", f"Failed to export STEAM ideas: {exc}")
            return
        messagebox.showinfo("Success", "STEAM ideas exported successfully.")

    def show_history(self) -> None:
        entries = self.history.entries()
        if entries:
            messagebox.showinfo("History of Last 5 Uses", "\n".join(entries))
        else:
            messagebox.showinfo("History", "No History Found")

    def show_about(self) -> None:
        messagebox.showinfo("About", ABOUT_TEXT)

    def change_api_key(self) -> None:
        key = ask_api_key(self.window, "Change API Key")
        if key:
            self.service = GeminiService(key)
            messagebox.showinfo("API Key Changed", "API key changed successfully.")

    def run(self) -> None:
        self.window.mainloop()


def main() -> None:
    root = tk.Tk()
    root.withdraw()
    key = ask_api_key(root, "Gemini API Key", api_key_from_env())
    if not key:
        root.destroy()
        return
    root.deiconify()
    SteamApp(root, key).run()
