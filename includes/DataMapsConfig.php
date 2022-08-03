<?php
namespace MediaWiki\Extension\Ark\DataMaps;

class DataMapsConfig {
    public static function getParserExpansionLimit(): int {
        global $wgDataMapMarkerParserExpansionLimit;
        return $wgDataMapMarkerParserExpansionLimit;
    }
}