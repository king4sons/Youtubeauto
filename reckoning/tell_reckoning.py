#!/usr/bin/env python3
"""
Quick text-based control for Reckoning's memory — no voice needed.

Usage:
    python3 tell_reckoning.py status "Working on the inheritance script today, need to source music"
    python3 tell_reckoning.py remember "I prefer Stage 3 composition done before any Stage 4 work starts"
    python3 tell_reckoning.py facts        # list everything it remembers (flat facts)
    python3 tell_reckoning.py status-check # show latest status

    # Structured memory (tagged, queryable):
    python3 tell_reckoning.py memory "The Reckoning Files" lesson "Finnish stories outperform generic revenge stories"
    python3 tell_reckoning.py memories                       # show recent structured memories
    python3 tell_reckoning.py memories "The Reckoning Files"  # filter by project

    # Pipeline status (what stage your active project is in):
    python3 tell_reckoning.py pipeline "She Was Written Out" "Stage 2 complete" "voiceover generation"
    python3 tell_reckoning.py pipeline-check   # show current pipeline status

    # App launch audit log:
    python3 tell_reckoning.py app-log

    # YouTube comment idea-mining (read-only — requires YOUTUBE_API_KEY in .env):
    python3 tell_reckoning.py mine-ideas              # most recent upload on your configured channel
    python3 tell_reckoning.py mine-ideas <video_id>    # a specific video

    # Reddit research (read-only — requires REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET in .env):
    python3 tell_reckoning.py mine-reddit <subreddit>             # top posts this month
    python3 tell_reckoning.py mine-reddit <subreddit> <query>     # search within that subreddit

    # Fact-check a script (read-only — uses live web search, not memory):
    python3 tell_reckoning.py fact-check path/to/script.txt
"""
import sys
from pathlib import Path
from memory_store import MemoryStore

memory = MemoryStore(Path(__file__).parent / "memory" / "reckoning.db")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "status" and len(sys.argv) > 2:
        memory.set_status(sys.argv[2])
        print("Status updated.")

    elif cmd == "remember" and len(sys.argv) > 2:
        memory.add_fact(sys.argv[2])
        print("Got it, remembered.")

    elif cmd == "facts":
        facts = memory.all_facts()
        if not facts:
            print("No facts stored yet.")
        for f in facts:
            print(f"- {f}")

    elif cmd == "status-check":
        print(memory.latest_status())

    elif cmd == "memory" and len(sys.argv) > 4:
        project, category, content = sys.argv[2], sys.argv[3], sys.argv[4]
        memory.add_memory(project, category, content)
        print(f"Stored memory under '{project}' / '{category}'.")

    elif cmd == "memories":
        project = sys.argv[2] if len(sys.argv) > 2 else None
        results = memory.query_memories(project=project, limit=20)
        if not results:
            print("No structured memories stored yet.")
        for m in results:
            print(f"[{m['date']}] {m['project']} / {m['category']}: {m['content']}")

    elif cmd == "pipeline" and len(sys.argv) > 3:
        project, stage = sys.argv[2], sys.argv[3]
        next_step = sys.argv[4] if len(sys.argv) > 4 else None
        memory.set_pipeline_status(project, stage, next_step)
        print(f"Pipeline status updated: {project} -> {stage}")

    elif cmd == "pipeline-check":
        status = memory.latest_pipeline_status()
        if not status:
            print("No pipeline status set yet.")
        else:
            print(f"{status['project']}: {status['stage']}"
                  + (f" (next: {status['next_step']})" if status['next_step'] else "")
                  + f" — updated {status['updated_at']}")

    elif cmd == "app-log":
        launches = memory.recent_app_launches()
        if not launches:
            print("No apps launched yet.")
        for l in launches:
            print(f"[{l['launched_at']}] opened {l['app']}")

    elif cmd == "mine-ideas":
        video_id = sys.argv[2] if len(sys.argv) > 2 else ""
        # Imported here (not at module top) so the lightweight commands above
        # don't pay the cost of loading Claude/Whisper/audio deps just to,
        # say, log a status update.
        from jarvis import mine_video_ideas
        from youtube_research import YouTubeResearchError
        try:
            print(mine_video_ideas(video_id))
        except YouTubeResearchError as e:
            print(f"Couldn't mine video ideas: {e}")

    elif cmd == "mine-reddit":
        if len(sys.argv) < 3:
            print("Usage: python3 tell_reckoning.py mine-reddit <subreddit> [search query]")
            sys.exit(1)
        subreddit = sys.argv[2]
        query = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
        from jarvis import mine_reddit_ideas
        from reddit_research import RedditResearchError
        try:
            print(mine_reddit_ideas(subreddit, query))
        except RedditResearchError as e:
            print(f"Couldn't mine Reddit ideas: {e}")

    elif cmd == "fact-check":
        if len(sys.argv) < 3:
            print("Usage: python3 tell_reckoning.py fact-check path/to/script.txt")
            sys.exit(1)
        script_path = Path(sys.argv[2])
        if not script_path.exists():
            print(f"Can't find that file: {script_path}")
            sys.exit(1)
        script_text = script_path.read_text()
        from jarvis import claude
        from fact_checker import fact_check_script, FactCheckError
        try:
            report = fact_check_script(claude, script_text)
            memory.add_memory(project="The Reckoning Files", category="fact_check", content=report)
            print(report)
        except FactCheckError as e:
            print(f"Couldn't fact-check that: {e}")

    else:
        print(__doc__)


if __name__ == "__main__":
    main()
