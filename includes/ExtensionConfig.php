<?php
namespace MediaWiki\Extension\Ark\DataMaps;

class ExtensionConfig {
    const FF_SHOW_COORDINATES = 'ShowCoordinates';
    const FF_SHOW_LEGEND_ABOVE = 'ShowLegendAlwaysAbove';
    const FF_REQUIRE_CUSTOM_MARKER_IDS = 'RequireCustomMarkerIDs';
    const FF_SEARCH = 'Search';
    const FF_SORT_CHECKLIST_BY_AMOUNT = 'SortChecklistsByAmount';

    public static function getParserExpansionLimit(): int {
        global $wgDataMapsMarkerParserExpansionLimit;
        return $wgDataMapsMarkerParserExpansionLimit;
    }

    public static function isNamespaceManaged(): bool {
        global $wgDataMapsNamespaceId;
        return $wgDataMapsNamespaceId == 'managed';
    }

    public static function getNamespaceId(): int {
        if ( self::isNamespaceManaged() ) {
            return NS_MAP;
        }
        global $wgDataMapsNamespaceId;
        return $wgDataMapsNamespaceId;
    }

    public static function getApiCacheType() {
        global $wgDataMapsCacheType;
        return $wgDataMapsCacheType;
    }

    public static function getApiCacheTTL(): int {
        global $wgDataMapsCacheTTL;
        return $wgDataMapsCacheTTL;
    }

    public static function shouldExtendApiCacheTTL(): bool {
        global $wgDataMapsExtendCacheTTL;
        return $wgDataMapsExtendCacheTTL != false;
    }

    public static function getApiCacheTTLExtensionThreshold(): int {
        global $wgDataMapsExtendCacheTTL;
        return $wgDataMapsExtendCacheTTL['threshold'];
    }

    public static function getApiCacheTTLExtensionValue(): int {
        global $wgDataMapsExtendCacheTTL;
        return $wgDataMapsExtendCacheTTL['override'];
    }

    public static function shouldApiReturnProcessingTime(): bool {
        global $wgDataMapsReportTimingInfo;
        return $wgDataMapsReportTimingInfo;
    }

    public static function getApiDefaultMarkerLimit(): int {
        return $GLOBALS['wgDataMapsDefaultApiMarkerBatch'];
    }

    public static function getApiMaxMarkerLimit(): int {
        return $GLOBALS['wgDataMapsMaxApiMarkerBatch'];
    }

    public static function shouldCacheWikitextInProcess(): bool {
        global $wgDataMapsUseInProcessParserCache;
        return $wgDataMapsUseInProcessParserCache;
    }

    public static function getDefaultFeatureStates(): array {
        global $wgDataMapsDefaultFeatures;
        return $wgDataMapsDefaultFeatures;
    }

    public static function getDefaultFeatureState( string $feature ) {
        return self::getDefaultFeatureStates()[$feature];
    }

    public static function isVisualEditorEnabled(): bool {
        return self::isBleedingEdge() && $GLOBALS['wgDataMapsEnableVisualEditor'];
    }

    public static function isBleedingEdge(): bool {
        global $wgDataMapsAllowExperimentalFeatures;
        return $wgDataMapsAllowExperimentalFeatures;
    }
}