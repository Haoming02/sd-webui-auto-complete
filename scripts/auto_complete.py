from modules.script_callbacks import on_ui_settings
from modules.shared import opts, OptionInfo
from modules import scripts

from gradio import Textbox, Slider, Radio
import os.path


def extra_networks() -> str:
    from modules.shared import cmd_opts
    from pathlib import Path

    EXTENSIONS = (".pt", ".pth", ".ckpt", ".safetensors", ".sft")
    items: list[str] = []

    embeddings = Path(cmd_opts.embeddings_dir)
    for ext in EXTENSIONS:
        files = embeddings.glob(f"**/*{ext}")
        for file in files:
            items.append(file.stem)

    loras = Path(cmd_opts.lora_dir)
    for ext in EXTENSIONS:
        files = loras.glob(f"**/*{ext}")
        for file in files:
            items.append(f"<l>{file.stem}")

    return "\n".join(items)


class ACServer(scripts.Script):

    def title(self):
        return "Auto Complete"

    def show(self, is_img2img):
        return scripts.AlwaysVisible if is_img2img else None

    def ui(self, is_img2img):
        if not is_img2img:
            return None

        _dir = os.path.normpath(os.path.dirname(os.path.dirname(__file__)))

        csv = os.path.join(_dir, "tags.csv")
        with open(csv, "r", encoding="utf-8") as file:
            tags = file.read()

        if (extras := getattr(opts, "ac_extras", "Off")) != "Off":
            networks = extra_networks()
            if extras == "Prepend":
                tags = f"{networks}\n{tags}"
            else:
                tags = f"{tags}\n{networks}"
            del networks

        custom = os.path.join(_dir, "custom.csv")
        if os.path.isfile(custom):
            with open(custom, "r", encoding="utf-8") as file:
                custom_tags = file.read()
            tags = f"{custom_tags}\n{tags}"
            del custom_tags

        link = Textbox(
            value=tags.strip(),
            visible=False,
            show_label=False,
            interactive=False,
            elem_id="ac_data",
        )

        link.do_not_save_to_config = True
        del tags


def add_ui_settings():
    args = {"section": ("ac", "Auto Complete"), "category_id": "system"}

    opts.add_option(
        "ac_limit",
        OptionInfo(
            4,
            "Maximum number of suggestions to display",
            Slider,
            {"minimum": 1, "maximum": 32, "step": 1},
            **args,
        ),
    )

    opts.add_option(
        "ac_delay",
        OptionInfo(
            50,
            "Delay (ms) between typing and displaying the suggestions",
            Slider,
            {"minimum": 25, "maximum": 250, "step": 25},
            **args,
        ).needs_reload_ui(),
    )

    opts.add_option(
        "ac_extras",
        OptionInfo(
            "Off",
            "Include ExtraNetworks",
            Radio,
            {"choices": ("Off", "Prepend", "Append")},
            **args,
        )
        .info("Embeddings / LoRA")
        .info("does <b>not</b> hot reload new models"),
    )


on_ui_settings(add_ui_settings)
