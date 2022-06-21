<?php
namespace Ark\DataMaps\API;

use ApiBase;
use ApiResult;
use Title;
use WikiPage;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use Wikimedia\ParamValidator\ParamValidator;
use ObjectCache;
use Ark\DataMaps\Content\DataMapContent;
use Ark\DataMaps\Data\DataMapSpec;
use Ark\DataMaps\Data\DataMapMarkerSpec;
use Ark\DataMaps\Rendering\DataMapEmbedRenderer;
use ParserOptions;

class ApiQueryDataMapEndpoint extends ApiBase {
    const POPUP_IMAGE_WIDTH = 240;

    public function getAllowedParams() {
        return [
            'title' => [
                ParamValidator::PARAM_TYPE => 'string',
                ParamValidator::PARAM_REQUIRED => true,
            ],
            'revid' => [
                ParamValidator::PARAM_TYPE => 'integer',
                ParamValidator::PARAM_REQUIRED => false,
            ],
            'filter' => [
                ParamValidator::PARAM_TYPE => 'string',
                ParamValidator::PARAM_REQUIRED => false,
            ],
        ];
    }

    public function execute() {
        global $wgArkDataMapCacheType;
        global $wgArkDataMapCacheExpiryTime;
        global $wgArkDataMapDebugApiProcessingTime;

        $timeStart = 0;
        if ( $wgArkDataMapDebugApiProcessingTime ) {
            $timeStart = hrtime( true );
        }

		$this->getMain()->setCacheMode( 'public' );
        $this->getMain()->setCacheMaxAge( 24 * 60 * 60 );

        $params = $this->extractRequestParams();

        $response = null;
        if ($wgArkDataMapCacheExpiryTime <= 0) {
            // Cache expiry time is zero or lower, bypass caching
            $response = $this->executeInternal( $params );
        } else {
            // Retrieve the specified cache instance
            $cache = ObjectCache::getInstance( $wgArkDataMapCacheType );
            // Build the cache key from an identifier, title parameter and revision ID parameter
            $revid = isset( $params['revid'] ) ? $params['revid'] : -1;
            $cacheKey = $cache->makeKey( 'ARKDataMapQuery', $params['title'], $revid,
                isset( $params['filter'] ) ? $params['filter'] : '' );
            // Try to retrieve the response
            $response = $cache->get( $cacheKey );
            if ( $response === false ) {
                // Response not cached, process the data in this request and write to cache
                $response = $this->executeInternal( $params );
                $cache->set( $cacheKey, $response, $wgArkDataMapCacheExpiryTime );
            }
        }
		
        $this->getResult()->addValue( null, 'query', $response );

        if ( $wgArkDataMapDebugApiProcessingTime ) {
            $timeEnd = hrtime( true );
            $this->getResult()->addValue( null, 'processingTime', $timeEnd - $timeStart );
        }
    }

    private function getRevisionFromParams( $params ) {
        global $wgArkDataNamespace;

        // Retrieve latest revision by title
        $title = Title::newFromText( $params['title'], $wgArkDataNamespace );
        if ( !$title->exists() ) {
            $this->dieWithError( [ 'apierror-invalidtitle', $params['title'] ] );
        }

        $revision = null;
        if ( isset( $params['revid'] ) ) {
            // Retrieve revision by ID
            $revisionStore = MediaWikiServices::getInstance()->getRevisionStore();
            $revision = $revisionStore->getRevisionById( $params['revid'] );
            if ( !$revision ) {
                $this->dieWithError( [ 'apierror-nosuchrevid', $params['revid'] ] );
            } else if ( $revision->getPageId() != $title->getId() ) {
                $this->dieWithError( [ 'apierror-revwrongpage', $revision->getId(), $title->getPrefixedText() ] );
            }
        } else {
            $revision = WikiPage::factory( $title )->getRevisionRecord();
        }

        return [ $title, $revision ];
    }

    private function executeInternal( $params ): array {
        list( $title, $revision ) = $this->getRevisionFromParams( $params );
        $content = $revision->getContent( SlotRecord::MAIN, RevisionRecord::FOR_PUBLIC, null );

        if ( !( $content instanceof DataMapContent ) ) {
            $this->dieWithError( [ 'contentmodel-mismatch', $content->getModel(), 'datamap' ] );
        }

        $dataMap = $content->asModel();
        $response = [
            'title' => $title->getFullText(),
            'revisionId' => $revision->getId(),
            'markers' => $this->processMarkers( $title, $dataMap, $params )
        ];

        // Armour any API metadata in $response
        $response = ApiResult::addMetadataToResultVars( $response, false );

        return $response;
    }

    private function processMarkers( Title $title, DataMapSpec $dataMap, $params ): array {
        $results = [];
		$parser = MediaWikiServices::getInstance()->getParser();

        // Extract filters from the request parameters
        $filter = null;
        if ( isset( $params['filter'] ) && !empty( $params['filter'] ) ) {
            $filter = explode( '|', $params['filter'] );
        }
        // Ignore filters if more than 9 are specified
        if ( count( $filter ) > 9 ) {
            $filter = null;
        }

        $dataMap->iterateRawMarkerMap( function( string $layers, array $rawMarkerCollection )
            use ( &$results, &$title, &$parser, $filter ) {

            // If filters were specified, check if there is any overlap between the filters list and skip the marker set
            if ( $filter !== null && empty( array_intersect( $filter, explode( ' ', $layers ) ) ) ) {
                return;
            }

            $subResults = [];
            // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
            // creating thousands of small, very short-lived (only one at a time) objects
            $marker = new DataMapMarkerSpec( new \stdclass() );

            // Prepare the wikitext parser
            $parserOptions = ParserOptions::newCanonical( 'canonical' );
            $parserOptions->enableLimitReport( false );
            $parserOptions->setAllowSpecialInclusion( false );
            $parserOptions->setExpensiveParserFunctionLimit( 0 );
            $parserOptions->setInterwikiMagic( false );
            $parserOptions->setMaxIncludeSize( 800 );

            foreach ( $rawMarkerCollection as &$rawMarker ) {
                $marker->reassignTo( $rawMarker );

                // Coordinates
                $converted = [
                    $marker->getLatitude(),
                    $marker->getLongitude()
                ];
                // Rich data
                $slots = [];

                // Popup title
                if ( $marker->getLabel() != null ) {
                    $slots['label'] = wfEscapeWikiText( $marker->getLabel() );
                    $requiresSlots = true;
                }

                // Popup description
                if ( $marker->getDescription() != null ) {
                    if ( $marker->isDescriptionWikitext() ) {
                        $slots['desc'] =
                            $parser->parse( $marker->getDescription(), $title, $parserOptions, false, true )
                                ->getText( [ 'unwrap' => true ] );
                    } else {
                        $slots['desc'] = wfEscapeWikiText( $marker->getDescription() );
                    }
                    $requiresSlots = true;
                }

                // Popup image thumbnail link
                if ( $marker->getPopupImage() != null ) {
                    $slots['image'] = DataMapEmbedRenderer::getIconUrl( $marker->getPopupImage(), self::POPUP_IMAGE_WIDTH );
                    $requiresSlots = true;
                }

                // Related article title
                if ( $marker->getRelatedArticle() != null ) {
                    $slots['article'] = $marker->getRelatedArticle();
                    $requiresSlots = true;
                }

                // Insert slots if any data has been added
                if ( !empty( $slots ) ) {
                    $converted[] = $slots;
                }

                $subResults[] = $converted;
            }

            $results[$layers] = $subResults;
        } );

        return $results;
    }
}