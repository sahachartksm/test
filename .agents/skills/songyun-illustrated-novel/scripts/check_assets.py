import argparse
import json
from pathlib import Path
from runpy import run_path


PROJECT = Path(__file__).resolve().parents[4]
MINIMUM_SCENES = 5


def has_file(path):
    return path.is_file() and path.stat().st_size > 0


def main():
    parser = argparse.ArgumentParser(description="Report pending Songyun character sheets and illustrations.")
    parser.add_argument("--require-complete", action="store_true", help="Exit with an error when assets are missing.")
    args = parser.parse_args()

    reader = run_path(str(PROJECT / "tools" / "build_reader.py"))
    try:
        plan = reader["load_plan"]()
        registry = json.loads((PROJECT / "production" / "characters.json").read_text(encoding="utf-8"))["characters"]
    except (OSError, ValueError) as error:
        parser.exit(1, f"Cannot read the production plan: {error}\n")

    expected_chapters = set(range(1, reader["CHAPTER_COUNT"] + 1))
    if set(plan) != expected_chapters:
        parser.exit(1, "The production plan and reader chapter list differ.\n")
    unknown = {name for scenes in plan.values() for scene in scenes for name in scene["characters"]} - registry.keys()
    if unknown:
        parser.exit(1, f"Missing characters in the registry: {', '.join(sorted(unknown))}\n")

    missing_sheets = [name for name, character in registry.items() if not has_file(PROJECT / character["sheet"])]
    for name in missing_sheets:
        print(f"Missing sheet {name} ({registry[name]['sheet']})")

    total, pending, complete = 0, 0, 0
    underplanned = []
    for number, scenes in sorted(plan.items()):
        if len(scenes) < MINIMUM_SCENES:
            underplanned.append(number)
            print(f"Chapter {number:02d} has {len(scenes)} of {MINIMUM_SCENES} required scene plans.")

        missing = [
            f"{number:02d}/{index:02d}"
            for index in range(1, len(scenes) + 1)
            if not has_file(PROJECT / "assets" / "illustrations" / f"{number:02d}" / f"{index:02d}.webp")
        ]
        if missing:
            print(f"Missing illustrations {' '.join(missing)}")
        elif len(scenes) >= MINIMUM_SCENES:
            complete += 1
        total += len(scenes)
        pending += len(missing)

    print(f"Character sheets {len(registry) - len(missing_sheets)}/{len(registry)}")
    print(f"Illustrations {total - pending}/{total} ({pending} pending)")
    print(f"Complete chapters {complete}/{len(expected_chapters)}")
    return int(args.require_complete and bool(missing_sheets or pending or underplanned))


if __name__ == "__main__":
    raise SystemExit(main())
