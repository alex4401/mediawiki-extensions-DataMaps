<?php
namespace MediaWiki\Extension\Ark\DataMaps;

use MediaWiki\MediaWikiServices;

class ExtensionConfig {
    public const FF_SHOW_COORDINATES = 'ShowCoordinates';
    public const FF_SHOW_LEGEND_ABOVE = 'ShowLegendAlwaysAbove';
    public const FF_REQUIRE_CUSTOM_MARKER_IDS = 'RequireCustomMarkerIDs';
    public const FF_SEARCH = 'Search';
    public const FF_SORT_CHECKLIST_BY_AMOUNT = 'SortChecklistsByAmount';

    public static function getParserExpansionLimit(): int {
        return MediaWikiServices::getInstance()->getMainConfig()
            ->get( 'DataMapsMarkerParserExpansionLimit' );
    }

    public static function isNamespaceManaged(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsNamespaceId' ) == 'managed';
    }

    public static function getNamespaceId(): int {
        if ( self::isNamespaceManaged() ) {
            return NS_MAP;
        }
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsNamespaceId' );
    }

    public static function getApiCacheType() {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsCacheType' );
    }

    public static function getApiCacheTTL(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsCacheTTL' );
    }

    public static function shouldExtendApiCacheTTL(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsExtendCacheTTL' ) != false;
    }

    public static function getApiCacheTTLExtensionThreshold(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsExtendCacheTTL' )['threshold'];
    }

    public static function getApiCacheTTLExtensionValue(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsExtendCacheTTL' )['override'];
    }

    public static function shouldApiReturnProcessingTime(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsReportTimingInfo' );
    }

    public static function getApiDefaultMarkerLimit(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsDefaultApiMarkerBatch' );
    }

    public static function getApiMaxMarkerLimit(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsMaxApiMarkerBatch' );
    }

    public static function shouldCacheWikitextInProcess(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsUseInProcessParserCache' );
    }

    public static function getDefaultFeatureStates(): array {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsDefaultFeatures' );
    }

    public static function getDefaultFeatureState( string $feature ) {
        return self::getDefaultFeatureStates()[$feature];
    }

    public static function isVisualEditorEnabled(): bool {
        return self::isBleedingEdge()
            && MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsEnableVisualEditor' );
    }

    public static function isCreateMapEnabled(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsEnableCreateMap' );
    }

    public static function isBleedingEdge(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( 'DataMapsAllowExperimentalFeatures' );
    }
}
