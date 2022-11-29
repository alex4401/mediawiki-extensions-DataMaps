<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

use MapCacheLRU;
use MediaWiki\Extension\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\DataMaps\Data\MarkerSpec;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use MediaWiki\MediaWikiServices;
use Parser;
use ParserOptions;
use Title;

class MarkerProcessor {
    private const POPUP_IMAGE_WIDTH = 250;
    private const MAX_LRU_SIZE = 128;

    private Parser $parser;
    private ParserOptions $parserOptions;
    private Title $title;
    private DataMapSpec $dataMap;
    private ?array $filter;
    private bool $isSearchEnabled;

    private bool $isParserDirty = true;
    private bool $useLocalParserCache = true;
    private ?MapCacheLRU $localParserCache = null;

    private bool $collectTimings = false;
    public $timeInParser = 0;

    public function __construct( Title $title, DataMapSpec $dataMap, ?array $filter ) {
        $this->parser = MediaWikiServices::getInstance()->getParser();
        $this->parserOptions = ParserOptions::newFromAnon();
        $this->title = $title;
        $this->dataMap = $dataMap;
        $this->filter = $filter;
        $this->isSearchEnabled = $this->dataMap->wantsSearch();
        // Pull configuration options
        $this->useLocalParserCache = ExtensionConfig::shouldCacheWikitextInProcess();
        $this->collectTimings = ExtensionConfig::shouldApiReturnProcessingTime();
        // Initialise the LRU
        if ( $this->useLocalParserCache ) {
            $this->localParserCache = new MapCacheLRU( self::MAX_LRU_SIZE );
        }
        // Configure the wikitext parser
        $this->parserOptions->setAllowSpecialInclusion( false );
        $this->parserOptions->setExpensiveParserFunctionLimit( 5 );
        $this->parserOptions->setInterwikiMagic( false );
        $this->parserOptions->setMaxIncludeSize( ExtensionConfig::getParserExpansionLimit() );
    }

    public function processAll(): array {
        $results = [];

        // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
        // creating thousands of small, very short-lived (only one at a time) objects
        $marker = new MarkerSpec( new \stdclass() );

        $this->dataMap->iterateRawMarkerMap( function ( string $layers, array $rawCollection ) use ( &$results, &$marker ) {
            // If filters were specified, check if there is any overlap between the filters list and skip the marker set
            if ( $this->filter !== null && empty( array_intersect( $this->filter, explode( ' ', $layers ) ) ) ) {
                return;
            }

            $subResults = [];
            foreach ( $rawCollection as &$rawMarker ) {
                $marker->reassignTo( $rawMarker );
                $subResults[] = $this->processOne( $marker );
            }

            if ( !empty( $subResults ) ) {
                $results[$layers] = $subResults;
            }
        } );

        return $results;
    }

    public function processOne( MarkerSpec $marker ): array {
        // Flag parser state as requiring a cleaning
        $this->isParserDirty = true;
        // Coordinates
        $converted = [
            $marker->getLatitude(),
            $marker->getLongitude()
        ];
        // Rich data
        $slots = [];

        // Custom persistent ID
        if ( $marker->getCustomPersistentId() != null ) {
            $slots['uid'] = $marker->getCustomPersistentId();
        }

        // Popup title
        if ( $marker->getLabel() != null ) {
            $slots['label'] = $this->stripParagraphTag( $this->parseText( $marker, $marker->getLabel() ) );
        }

        // Popup description
        if ( $marker->getDescription() != null ) {
            $slots['desc'] = $this->parseMultilineText( $marker, $marker->getDescription() );
        }

        // Popup image thumbnail link
        if ( $marker->getPopupImage() != null ) {
            $thumb = DataMapFileUtils::getRequiredFile( $marker->getPopupImage(), self::POPUP_IMAGE_WIDTH );
            $slots['image'] = [
                $thumb->getURL(),
                $thumb->getFile()->getWidth(),
                $thumb->getFile()->getHeight()
            ];
        }

        // Related article title
        if ( $marker->getRelatedArticle() != null ) {
            $slots['article'] = $marker->getRelatedArticle();
        }

        // Search keywords
        if ( $this->isSearchEnabled ) {
            if ( !$marker->isIncludedInSearch() ) {
                $slots['search'] = 0;
            } elseif ( $marker->getSearchKeywords() != null ) {
                $keywords = $marker->getSearchKeywords();
                if ( $this->canImplodeSearchKeywords( $keywords ) ) {
                    $keywords = implode( ' ', $keywords );
                }
                $slots['search'] = $keywords;
            }
        }

        // Insert slots if any data has been added
        if ( !empty( $slots ) ) {
            $converted[] = $slots;
        }

        return $converted;
    }

    public static function shouldParseString( MarkerSpec $marker, string $text ): bool {
        $mIsWikitext = $marker->isWikitext();
        if ( $mIsWikitext === false ) {
            return false;
        }
        return $mIsWikitext || preg_match( "/\{\{|\[\[|\'\'|<\w+|&[\d\w]+/", $text ) === 1;
    }

    private function parseWikitext( string $text ): string {
        // Look up in local cache if enabled
        if ( $this->useLocalParserCache && $this->localParserCache->has( $text ) ) {
            return $this->localParserCache->get( $text );
        }

        $timeStart = 0;
        if ( $this->collectTimings ) {
            $timeStart = hrtime( true );
        }

        // Call the parser
        $out = $this->parser->parse( $text, $this->title, $this->parserOptions, false, $this->isParserDirty )
            ->getText( [
                'unwrap' => true,
                'allowTOC' => false,
                'includeDebugInfo' => false
            ] );
        // Mark as clean to avoid clearing state again
        $this->isParserDirty = false;

        if ( $this->collectTimings ) {
            $this->timeInParser += hrtime( true ) - $timeStart;
        }

        // Store in local cache if enabled
        if ( $this->useLocalParserCache ) {
            $this->localParserCache->set( $text, $out );
        }

        return $out;
    }

    private function parseText( MarkerSpec $marker, string $text ): string {
        if ( self::shouldParseString( $marker, $text ) ) {
            return $this->parseWikitext( $text );
        }
        return wfEscapeWikiText( $text );
    }

    private function parseMultilineText( MarkerSpec $marker, /*array|string*/ $text ): string {
        if ( is_array( $text ) ) {
            $text = implode( "\n", $text );
        }
        return $this->parseText( $marker, $text );
    }

    private function stripParagraphTag( string $text ): string {
        if ( str_starts_with( $text, '<p>' ) ) {
            $text = substr( $text, 3 );
        }
        if ( str_ends_with( $text, '</p>' ) ) {
            $text = substr( $text, 0, strlen( $text ) - 4 );
        }
        return $text;
    }

    private function canImplodeSearchKeywords( $keywords ): bool {
        if ( is_array( $keywords ) ) {
            foreach ( $keywords as &$item ) {
                if ( !is_string( $item ) ) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
}
