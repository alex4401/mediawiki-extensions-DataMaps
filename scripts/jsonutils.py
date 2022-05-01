import json
import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

__all__ = [
    'save_as_json',
]


NUMBER_RE = r'[+-]?\d+(\.\d+)?([eE][-+]?\d+)?|true|false'

# Join 2-line color (name, [r,g,b,e]) data onto one line
JOIN_COLORS_REGEX = re.compile(r"\[\n\s+([\w\" ]+),\n\s+(.{,90})\n\s+\]")

# Reduce 2-12 numbers in an array onto a single line
JOIN_MULTIPLE_NUMBERS_REGEX = re.compile(r'(\n\s+)(' + NUMBER_RE + r'),(?:\n\s+(?:' + NUMBER_RE + r'|null|"[^"\n\t]*"),?){1,12}')

# Reduce short arrays of strings onto a single line
JOIN_MULTIPLE_STRINGS_REGEX = re.compile(r'\[((?:\n\s+".{1,30}",?\s*$){1,4})\n\s+\]', re.MULTILINE)

# Reduces dict fields with only a single line of content (including previously joined multiple fields) to a single line
COLLAPSE_SINGLE_LINE_DICT_REGEX = re.compile(r"\{\n\s+(\"\w+\": [^}\n\]]{1,120})\n\s+\}")

# Reduce arrays with only a single line of content (including previously joined multiple fields) to a single line
COLLAPSE_SINGLE_LINE_ARRAY_REGEX = re.compile(r'\[\s+(.+)\s+\]')

# Sets of named fields that should be combined onto a single line
# Only applies if all fields are found
JOIN_LINE_FIELDS = (
    'x|y',
    'x|y|z',
    'a|b',
    'a|b|c',
    'lat|long?',
    'name|interval|dmg|radius|stamina',
    'base|sprint',
    'base|crouch|sprint',
    'min|max',
    'min|max|pow',
    'chance|min|max',
    'qty|type',
    'exact|qty|type',
    'stat|value|useItemQuality',
    'stat|value|useItemQuality|duration',
)


def _flattener(group=0, prefix='', postfix=None):
    '''Flatten spaces/newlines in the found string.'''
    if postfix is None:
        postfix = prefix

    def _fn(match):
        txt = match[group]
        txt = re.sub(r'\s*\n\s+', '', txt)
        txt = txt.replace(',', ', ')
        return f'{prefix}{txt}{postfix}'

    return _fn


def _flatten_re_result(match):
    txt = match[0]
    txt = re.sub(r'\s*\n\s+', '', txt)
    txt = txt.replace(',', ', ')
    return f'{match[1]}{txt}'


def _format_json(data, pretty=False):
    '''JSON with added beautification!'''
    if pretty:
        json_string = json.dumps(data, indent='\t')

        # Handle moving sets of terms onto single lines
        for term in JOIN_LINE_FIELDS:
            field_part = rf'(?:(\"(?:{term})\": [^,\n]+,?))'
            field_count = term.count('|') + 1
            full_re = r'\s+'.join([field_part] * field_count) + r'(\s+)'
            subs = ' '.join(f'\\{n+1}' for n in range(field_count)) + f'\\{field_count+1}'
            json_string = re.sub(full_re, subs, json_string)

        json_string = re.sub(JOIN_MULTIPLE_NUMBERS_REGEX, _flatten_re_result, json_string)
        json_string = re.sub(JOIN_MULTIPLE_STRINGS_REGEX, _flattener(1, '[ ', ' ]'), json_string)
        json_string = re.sub(COLLAPSE_SINGLE_LINE_DICT_REGEX, r"{ \1 }", json_string)
        json_string = re.sub(COLLAPSE_SINGLE_LINE_ARRAY_REGEX, r"[ \1 ]", json_string)
        json_string = re.sub(JOIN_COLORS_REGEX, r"[ \1, \2 ]", json_string)
    else:
        json_string = json.dumps(data, indent=None, separators=(',', ':'))
    return json_string


def save_as_json(data, filename, pretty=False):
    path = Path(filename).parent
    path.mkdir(parents=True, exist_ok=True)
    json_string = _format_json(data, pretty)
    with open(filename, 'w', newline='\n') as f:
        f.write(json_string)
