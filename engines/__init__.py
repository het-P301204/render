"""Template engine modules for RENDER SSTI research platform."""

from engines.base import TemplateEngine
from engines.jinja2_engine import Jinja2Engine
from engines.handlebars_engine import HandlebarsEngine
from engines.nunjucks_engine import NunjucksEngine
from engines.mako_engine import MakoEngine

ALL_ENGINES: dict[str, TemplateEngine] = {
    "jinja2": Jinja2Engine(),
    "handlebars": HandlebarsEngine(),
    "nunjucks": NunjucksEngine(),
    "mako": MakoEngine(),
}

__all__ = [
    "TemplateEngine",
    "Jinja2Engine",
    "HandlebarsEngine",
    "NunjucksEngine",
    "MakoEngine",
    "ALL_ENGINES",
]
