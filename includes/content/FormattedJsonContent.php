<?php

class ArkFormattedJsonContent extends JsonContent {

    const NUMBER_RE = '[+-]?\d+(\.\d+)?([eE][-+]?\d+)?|true|false';
    # Join 2-line color (name, [r,g,b,e]) data onto one line
    const JOIN_COLORS_RE = "\[\n\s+([\w\" ]+),\n\s+(.{,90})\n\s+\]";
    # Reduce 2-12 numbers in an array onto a single line
    const JOIN_MULTIPLE_NUMBERS_RE = '(\n\s+)(' . self::NUMBER_RE . '),(?:\n\s+(?:' . self::NUMBER_RE . '|null|"[^"\n\t]*"),?){1,12}';
    # Reduce short arrays of strings onto a single line
    const JOIN_MULTIPLE_STRINGS_RE = '\[((?:\n\s+".{1,30}",?\s*$){1,4})\n\s+\]';
    # Reduces dict fields with only a single line of content (including previously joined multiple fields) to a single line
    const COLLAPSE_SINGLE_LINE_DICT_RE = "\{\n\s+(\"\w+\": [^}\n\]]{1,120})\n\s+\}";
    # Reduce arrays with only a single line of content (including previously joined multiple fields) to a single line
    const COLLAPSE_SINGLE_LINE_ARRAY_RE = '\[\s+(.+)\s+\]';

	public function beautifyJSON() {
		return FormatJson::encode( $this->getData()->getValue(), true, FormatJson::UTF8_OK );
	}
}
