<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

use MapCacheLRU;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\DataMaps\ConfigNames;
use MediaWiki\Extension\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use ParserFactory;
use ParserOptions;
use Title;

final class MarkerProcessorFactory {
    public const SERVICE_NAME = 'DataMaps.MarkerProcessorFactory';

    private const MAX_LRU_SIZE = 128;

    /** @var ParserFactory */
    private ParserFactory $parserFactory;

    /** @var ExtensionConfig */
    private ExtensionConfig $config;

    public function __construct(
        ParserFactory $parserFactory,
        ExtensionConfig $config
    ) {
        $this->parserFactory = $parserFactory;
        $this->config = $config;
    }

    public function createParserOptions(): ParserOptions {
        $result = ParserOptions::newFromAnon();
        $result->setAllowSpecialInclusion( false );
        $result->setExpensiveParserFunctionLimit( 5 );
        $result->setInterwikiMagic( false );
        $result->setMaxIncludeSize( $this->config->getParserExpansionLimit() );
        return $result;
    }

    public function create(
        Title $title,
        DataMapSpec $dataMap,
        ?array $filter
    ): MarkerProcessor {
        $lru = null;
        if ( $this->config->shouldCacheWikitextInProcess() ) {
            $lru = new MapCacheLRU( self::MAX_LRU_SIZE );
        }

        return new MarkerProcessor(
            $this->parserFactory->create(),
            $this->createParserOptions(),
            $this->config,
            $lru,
            $title,
            $dataMap,
            $filter
        );
    }
}
