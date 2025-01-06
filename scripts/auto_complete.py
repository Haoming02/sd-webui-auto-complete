from modules import scripts
from gradio import Textbox
from os import path


class ACServer(scripts.Script):

    def title(self):
        return "Auto Complete"

    def show(self, is_img2img):
        return scripts.AlwaysVisible if is_img2img else None

    def ui(self, is_img2img):
        file = path.join(path.dirname(path.dirname(__file__)), "tags.csv")
        link = Textbox(
            value=file,
            visible=False,
            show_label=False,
            interactive=False,
            elem_id="ac_url",
        )

        link.do_not_save_to_config = True
