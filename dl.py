# https://danbooru.donmai.us/wiki_pages/api:tags

import os
import time
from pathlib import Path

import curl_cffi
from curl_cffi.requests.exceptions import RequestException

GENERAL = 0
COPYRIGHT = 3
CHARACTER = 4
META = 5


class Configs:
    escape_brackets: bool = True
    keep_underscore: bool = False
    min_post_count: int = 256
    max_tag_count: int = 40000


def _filter(tag: str) -> bool:
    if tag.endswith("request"):
        return False
    if "cosplay" in tag:
        return False
    if "meme" in tag:
        return False

    return True


def _preprocess(tag: str) -> str:
    if not Configs.keep_underscore:
        tag = tag.replace("_", " ")
    if Configs.escape_brackets:
        tag = tag.replace("(", "\\(").replace(")", "\\)")
    return f"{tag}\n"


API = "https://danbooru.donmai.us/tags.json"
params = {
    "limit": 1000,
    "search[hide_empty]": True,
    "search[is_deprecated]": False,
    "search[order]": "count",
}

OUT = Path(__file__).with_name("tags.csv")
TMP = Path(__file__).with_name("tags.csv.tmp")

file = open(TMP, mode="w", encoding="utf-8")
queue: list[float] = []
page: int = 0
count: int = 0

success: bool = False

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

        response = curl_cffi.get(API, params=params, timeout=5.0, impersonate="chrome")
        if response.status_code != 200:
            raise ConnectionError(response.status_code)

        data: list[dict[str, str | int]] = response.json()
        if not data:
            break

        for tag in data:
            if tag.get("post_count", -1) < Configs.min_post_count:
                isDone = True
                break

            name = tag["name"]
            if not _filter(name):
                continue

            category = tag.get("category", -1)
            if category in (GENERAL, COPYRIGHT, CHARACTER, META):
                file.write(_preprocess(name))
                count += 1

            if count == Configs.max_tag_count:
                isDone = True
                break

        queue.append(time.monotonic())

    success = True

except (RequestException, ConnectionError):
    print("Failed to download page...")
except (KeyboardInterrupt, EOFError):
    print("Interrupted...")
except Exception as e:
    print(e)
finally:
    file.flush()
    file.close()
    if success:
        os.replace(TMP, OUT)
        print("Download Finished!")
    else:
        TMP.unlink(missing_ok=True)
        print("Download Incomplete... Keeping previous tags.csv")
