from modules.script_callbacks import on_ui_settings
from modules.shared import opts, OptionInfo
from modules import scripts

from gradio import Textbox, Slider
from os import path


class ACServer(scripts.Script):

    def title(self):
        return "Auto Complete"

    def show(self, is_img2img):
        return scripts.AlwaysVisible if is_img2img else None

    def ui(self, is_img2img):
        if not is_img2img:
            return None

        file = path.join(path.dirname(path.dirname(__file__)), "tags.csv")
        link = Textbox(
            value=file,
            visible=False,
            show_label=False,
            interactive=False,
            elem_id="ac_url",
        )

        link.do_not_save_to_config = True


def add_ui_settings():
    opts.add_option(
        "ac_limit",
        OptionInfo(
            16,
            "Maximum number of suggestion entries to show",
            Slider,
            {"minimum": 1, "maximum": 256, "step": 1},
            section=("system", "System"),
        ),
    )

    opts.add_option(
        "ac_delay",
        OptionInfo(
            0,
            "Delay between typing and showing suggestions",
            Slider,
            {"minimum": 0, "maximum": 400, "step": 10},
            section=("system", "System"),
        )
        .info("0 = Disabled")
        .needs_reload_ui(),
    )


on_ui_settings(add_ui_settings)
