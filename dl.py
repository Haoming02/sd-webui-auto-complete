class Configs:
    """Wiki: https://danbooru.donmai.us/wiki_pages/api:tags"""

    min_post_count = 64

    dl_general = True
    dl_artist = None  # disabled
    dl_copyright = True
    dl_character = True
    dl_meta = False

    keep_underscore = False
    escape_brackets = True


API = "https://danbooru.donmai.us/tags.json?limit=1000&search[hide_empty]=yes&search[is_deprecated]=no&search[order]=count"

GENERAL = 0
COPYRIGHT = 3
CHARACTER = 4
META = 5


import requests
import time


def preprocess(tag: str) -> str:
    if not Configs.keep_underscore:
        tag = tag.replace("_", " ")
    if Configs.escape_brackets:
        tag = tag.replace("(", "\\(").replace(")", "\\)")
    return f"{tag}\n"


finished = False
with open("tags.csv", mode="w+", encoding="utf-8") as file:
    try:
        for page in range(1, 100):
            print(f"Page {page}...", end="\r")
            url = f"{API}&page={page}"

            response = requests.get(url)
            if response.status_code != 200:
                raise ConnectionError(response.status_code)

            data = response.json()
            if not data:
                break

            for item in data:
                if item.get("post_count", -1) < Configs.min_post_count:
                    finished = True
                    break

                category = item.get("category", -1)

                if category == GENERAL and Configs.dl_general:
                    file.write(preprocess(item["name"]))
                elif category == COPYRIGHT and Configs.dl_copyright:
                    file.write(preprocess(item["name"]))
                elif category == CHARACTER and Configs.dl_character:
                    file.write(preprocess(item["name"]))
                elif category == META and Configs.dl_meta:
                    file.write(preprocess(item["name"]))

            file.flush()

            if finished:
                break
            else:
                time.sleep(0.25)

    except KeyboardInterrupt:
        print("Interrupted...")
    except EOFError:
        print("Interrupted...")
    except Exception:
        from traceback import format_exc
        print("\n", format_exc(), "\n")

print("Finished Downloading Tags...")
