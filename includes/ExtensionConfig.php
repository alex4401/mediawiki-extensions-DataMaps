<?php
namespace MediaWiki\Extension\Ark\DataMaps;

class ExtensionConfig {
    const FF_SHOW_COORDINATES = 'ShowCoordinates';
    const FF_SHOW_LEGEND_ABOVE = 'ShowLegendAlwaysAbove';
    const FF_REQUIRE_CUSTOM_MARKER_IDS = 'RequireCustomMarkerIDs';
    const FF_SEARCH = 'Search';
    const FF_SORT_CHECKLIST_BY_AMOUNT = 'SortChecklistsByAmount';

    public static function getParserExpansionLimit(): int {
        return $GLOBALS['wgDataMapsMarkerParserExpansionLimit'];
    }

    public static function isNamespaceManaged(): bool {
        return $GLOBALS['wgDataMapsNamespaceId'] == 'managed';
    }

    public static function getNamespaceId(): int {
        if ( self::isNamespaceManaged() ) {
            return NS_MAP;
        }
        return $GLOBALS['wgDataMapsNamespaceId'];
    }

    public static function getApiCacheType() {
        return $GLOBALS['wgDataMapsCacheType'];
    }

    public static function getApiCacheTTL(): int {
        return $GLOBALS['wgDataMapsCacheTTL'];
    }

    public static function shouldExtendApiCacheTTL(): bool {
        return $GLOBALS['wgDataMapsExtendCacheTTL'] != false;
    }

    public static function getApiCacheTTLExtensionThreshold(): int {
        return $GLOBALS['wgDataMapsExtendCacheTTL']['threshold'];
    }

    public static function getApiCacheTTLExtensionValue(): int {
        return $GLOBALS['wgDataMapsExtendCacheTTL']['override'];
    }

    public static function shouldApiReturnProcessingTime(): bool {
        return $GLOBALS['wgDataMapsReportTimingInfo'];
    }

    public static function getApiDefaultMarkerLimit(): int {
        return $GLOBALS['wgDataMapsDefaultApiMarkerBatch'];
    }

    public static function getApiMaxMarkerLimit(): int {
        return $GLOBALS['wgDataMapsMaxApiMarkerBatch'];
    }

    public static function shouldCacheWikitextInProcess(): bool {
        return $GLOBALS['wgDataMapsUseInProcessParserCache'];
    }

    public static function getDefaultFeatureStates(): array {
        return $GLOBALS['wgDataMapsDefaultFeatures'];
    }

    public static function getDefaultFeatureState( string $feature ) {
        return self::getDefaultFeatureStates()[$feature];
    }

    public static function isVisualEditorEnabled(): bool {
        return self::isBleedingEdge() && $GLOBALS['wgDataMapsEnableVisualEditor'];
    }

    public static function isBleedingEdge(): bool {
        return $GLOBALS['wgDataMapsAllowExperimentalFeatures'];
    }
}