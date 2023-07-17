<?php
namespace MediaWiki\Extension\DataMaps;

use MediaWiki\MediaWikiServices;

class ExtensionConfig {
    public static function getParserExpansionLimit(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::ParserExpansionLimit );
    }

    public static function isNamespaceManaged(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::NamespaceId ) == 'managed';
    }

    public static function getNamespaceId(): int {
        if ( self::isNamespaceManaged() ) {
            return NS_MAP;
        }
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::NamespaceId );
    }

    public static function getApiCacheSettings() {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::ApiCacheSettings );
    }

    public static function getApiCacheType() {
        return self::getApiCacheSettings()['type'];
    }

    public static function getApiCacheTTL(): int {
        return self::getApiCacheSettings()['ttl'];
    }

    public static function shouldExtendApiCacheTTL(): bool {
        $settings = self::getApiCacheSettings();
        return $settings['ttlExtensionThreshold'] === false || $settings['ttlExtensionValue'] === false;
    }

    public static function getApiCacheTTLExtensionThreshold(): int {
        return self::getApiCacheSettings()['ttlExtensionThreshold'];
    }

    public static function getApiCacheTTLExtensionValue(): int {
        return self::getApiCacheSettings()['ttlExtensionValue'];
    }

    public static function shouldApiReturnProcessingTime(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::ReportTimingInfo );
    }

    public static function getApiDefaultMarkerLimit(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::DefaultApiMarkerBatchSize );
    }

    public static function getApiMaxMarkerLimit(): int {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::MaxApiMarkerBatchSize );
    }

    public static function shouldCacheWikitextInProcess(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::UseInProcessParserCache );
    }

    public static function shouldLinksUpdatesUseMarkers() {
        return self::getLinksUpdateBudget() > 0;
    }

    public static function getLinksUpdateBudget() {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::LinksUpdateBudget );
    }

    public static function isTransclusionAliasEnabled(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::EnableTransclusionAlias );
    }

    public static function isVisualEditorEnabled(): bool {
        return self::isBleedingEdge()
            && MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::EnableVisualEditor );
    }

    public static function isCreateMapEnabled(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::EnableCreateMap );
    }

    public static function areFandomPortingToolsEnabled(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::EnablePortingTools );
    }

    public static function isBleedingEdge(): bool {
        return MediaWikiServices::getInstance()->getMainConfig()->get( ConfigNames::EnableExperimentalFeatures );
    }
}
