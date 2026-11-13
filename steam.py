"""Compatibility entry point: ``python steam.py`` (and a PyInstaller build) still work. The code is in src/steam_generator."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / "src"))

from steam_generator.app import main  # noqa: E402

if __name__ == "__main__":
    main()
