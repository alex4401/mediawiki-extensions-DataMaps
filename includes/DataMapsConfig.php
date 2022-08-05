<?php
namespace MediaWiki\Extension\Ark\DataMaps;

class DataMapsConfig {
    public static function getParserExpansionLimit(): int {
        global $wgDataMapsMarkerParserExpansionLimit;
        return $wgDataMapsMarkerParserExpansionLimit;
    }

    public static function getNamespace(): int {
        global $wgDataMapsNamespaceId;
        return $wgDataMapsNamespaceId;
    }

    public static function getApiCacheType() {
        global $wgDataMapsCacheType;
        return $wgDataMapsCacheType;
    }

    public static function getApiCacheExpiryTime(): int {
        global $wgDataMapsCacheExpiryTime;
        return $wgDataMapsCacheExpiryTime;
    }

    public static function shouldApiReturnProcessingTime(): bool {
        global $wgDataMapsDebugApiProcessingTime;
        return $wgDataMapsDebugApiProcessingTime;
    }

    public static function shouldShowCoordinates(): bool {
        global $wgDataMapsShowCoordinatesDefault;
        return $wgDataMapsShowCoordinatesDefault;
    }
}