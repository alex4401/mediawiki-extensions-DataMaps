<?php

use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use MediaWiki\Extension\DataMaps\Rendering\MarkerProcessorFactory;
use MediaWiki\MediaWikiServices;

return [
    ExtensionConfig::SERVICE_NAME => static function (
        MediaWikiServices $services
    ): ExtensionConfig {
        return new ExtensionConfig(
            new ServiceOptions(
                ExtensionConfig::CONSTRUCTOR_OPTIONS,
                $services->getMainConfig()
            ),
        );
    },

    MarkerProcessorFactory::SERVICE_NAME => static function (
        MediaWikiServices $services
    ): MarkerProcessorFactory {
        return new MarkerProcessorFactory(
            $services->getParserFactory(),
            $services->get( ExtensionConfig::SERVICE_NAME ),
        );
    },
];
