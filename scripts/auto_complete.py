from modules.script_callbacks import on_ui_settings
from modules.shared import opts, OptionInfo
from modules import scripts

from gradio import Textbox, Slider, Radio
from os import path


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

        csv = path.join(path.dirname(path.dirname(__file__)), "tags.csv")
        with open(csv, "r", encoding="utf-8") as file:
            tags = file.read()

        if (extras := getattr(opts, "ac_extras", "Off")) != "Off":
            networks = extra_networks()
            if extras == "Prepend":
                tags = f"{networks}\n{tags}"
            else:
                tags = f"{tags}\n{networks}"

        link = Textbox(
            value=tags,
            visible=False,
            show_label=False,
            interactive=False,
            elem_id="ac_data",
        )

        link.do_not_save_to_config = True
        del csv
        del tags


def add_ui_settings():
    section = ("ac", "Auto Complete")

    opts.add_option(
        "ac_limit",
        OptionInfo(
            16,
            "Maximum number of suggestion entries to show",
            Slider,
            {"minimum": 1, "maximum": 256, "step": 1},
            section=section,
            category_id="system",
        ),
    )

    opts.add_option(
        "ac_delay",
        OptionInfo(
            0,
            "Delay between typing and showing suggestions",
            Slider,
            {"minimum": 0, "maximum": 400, "step": 10},
            section=section,
            category_id="system",
        )
        .info("0 = Disabled")
        .needs_reload_ui(),
    )

    opts.add_option(
        "ac_extras",
        OptionInfo(
            "Off",
            "Include ExtraNetworks",
            Radio,
            {"choices": ("Off", "Prepend", "Append")},
            section=section,
            category_id="system",
        )
        .info("Embeddings / LoRA")
        .info("does <b>not</b> hot reload new models"),
    )


on_ui_settings(add_ui_settings)
