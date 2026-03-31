"""
Veridict X (Twitter) Poster for @XAIPAgent

Usage:
  python scripts/x-post.py "Tweet text here"
  python scripts/x-post.py "Reply text" --reply-to 1234567890
"""

import os
import sys
import tweepy
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def get_client():
    return tweepy.Client(
        consumer_key=os.getenv("X_API_KEY"),
        consumer_secret=os.getenv("X_API_SECRET"),
        access_token=os.getenv("X_ACCESS_TOKEN"),
        access_token_secret=os.getenv("X_ACCESS_TOKEN_SECRET"),
    )

def post(text, reply_to=None):
    client = get_client()
    kwargs = {"text": text}
    if reply_to:
        kwargs["in_reply_to_tweet_id"] = reply_to
    response = client.create_tweet(**kwargs)
    tweet_id = response.data["id"]
    url = f"https://x.com/XAIPAgent/status/{tweet_id}"
    print(f"Posted! {url}")
    return tweet_id

def main():
    args = sys.argv[1:]
    if not args:
        print("Usage:")
        print('  python scripts/x-post.py "Tweet text"')
        print('  python scripts/x-post.py "Reply text" --reply-to <tweet_id>')
        sys.exit(1)

    reply_to = None
    if "--reply-to" in args:
        idx = args.index("--reply-to")
        reply_to = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    text = " ".join(args)

    if len(text) > 280:
        print(f"Error: Tweet is {len(text)} chars (max 280)")
        sys.exit(1)

    print(f"Posting ({len(text)} chars):")
    print(f"  {text[:100]}{'...' if len(text) > 100 else ''}")
    post(text, reply_to)

if __name__ == "__main__":
    main()
