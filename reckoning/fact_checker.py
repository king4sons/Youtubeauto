"""
Reckoning — script fact-checking, for The Reckoning Files.

Pulls the concrete factual claims out of a script (names, dates, events,
numbers, quotes attributed to real people) and checks each one against
real sources, found via live web search — not recalled from memory, which
is exactly the failure mode this is meant to catch. Claude does the
searching itself, server-side, through Anthropic's web_search tool.

This is READ-ONLY, same as youtube_research.py: it only ever searches and
reads. It never publishes, posts, or edits anything on your behalf, and it
is not legal advice or a guarantee — for anything where getting it wrong
could be reputationally or legally costly (e.g. naming a real living
person in connection with a crime), verify it yourself too. Treat this as
a fast first pass, not a clearance.
"""
import anthropic

WEB_SEARCH_TOOL = {"type": "web_search_20250305", "name": "web_search", "max_uses": 8}

FACT_CHECK_PROMPT = """\
This is a draft script for The Reckoning Files, a true-crime / dark-storytelling
YouTube channel. Pull out every concrete factual claim (names, dates, events,
numbers, quotes attributed to real people) and verify each one against real
sources you actually look up — don't rely on memory alone.

For each claim, report one of:
- VERIFIED: short note + the source
- DISPUTED: what the sources actually say instead + the source
- UNVERIFIED: couldn't find a source either way

Paraphrase what each source says rather than quoting it at length. If a claim
has no real-world factual content to check (scene-setting, narration style,
opinion, etc.), skip it — don't pad the report with non-claims.

SCRIPT:
{script_text}
"""


class FactCheckError(Exception):
    """Raised for any fact-checking failure, with a message safe to show the user."""
    pass


def fact_check_script(claude_client: anthropic.Anthropic, script_text: str) -> str:
    """
    Returns a claim-by-claim verification report for script_text. Raises
    FactCheckError on empty input or if the API call itself fails (e.g. the
    installed anthropic SDK is too old to support the web_search tool).
    """
    if not script_text or not script_text.strip():
        raise FactCheckError("No script text given to fact-check.")

    try:
        response = claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            tools=[WEB_SEARCH_TOOL],
            messages=[{
                "role": "user",
                "content": FACT_CHECK_PROMPT.format(script_text=script_text),
            }],
        )
    except anthropic.APIError as e:
        raise FactCheckError(
            f"Fact-check request failed ({e}). If this mentions an unsupported "
            "tool type, run: pip install --upgrade anthropic"
        )

    report = "".join(block.text for block in response.content if block.type == "text")
    if not report.strip():
        raise FactCheckError("Got an empty response back — try again?")
    return report
