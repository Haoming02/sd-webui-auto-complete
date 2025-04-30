# https://danbooru.donmai.us/wiki_pages/api:tags #

import time
import requests

GENERAL = 0
COPYRIGHT = 3
CHARACTER = 4
META = 5


class Configs:
    escape_brackets: bool = True
    keep_underscore: bool = False
    min_post_count: int = 128


def _preprocess(tag: str) -> str:
    if not Configs.keep_underscore:
        tag = tag.replace("_", " ")
    if Configs.escape_brackets:
        tag = tag.replace("(", "\\(").replace(")", "\\)")
    return f"{tag}\n"


API = "https://danbooru.donmai.us/tags.json"
params = {
    "limit": 2000,
    "search[hide_empty]": True,
    "search[is_deprecated]": False,
    "search[order]": "count",
}

file = open("tags.csv", mode="w+", encoding="utf-8")
queue: list[float] = []
page: int = 0

try:
    print("Downloading...")
    isDone = False

    while not isDone:

        if len(queue) == 10:
            t = queue.pop(0)
            elapsed = time.monotonic() - t
            if (delay := 1.0 - elapsed) > 0.0:
                time.sleep(delay)

        page += 1
        params["page"] = page
        print(f"Page {page}...", end="\r")

        response = requests.get(API, params=params, timeout=2.5)
        if response.status_code != 200:
            raise ConnectionError(response.status_code)

        data: list[dict[str, str | int]] = response.json()
        if not data:
            break

        for tag in data:
            if tag.get("post_count", -1) < Configs.min_post_count:
                isDone = True
                break

            category = tag.get("category", -1)
            if category in (GENERAL, COPYRIGHT, CHARACTER, META):
                file.write(_preprocess(tag["name"]))

        queue.append(time.monotonic())

except (TimeoutError, ConnectionError):
    print("Failed to download page...")
except (KeyboardInterrupt, EOFError):
    print("Interrupted...")
except Exception as e:
    print(e)
finally:
    file.flush()
    file.close()
    print("Download Finished!")
