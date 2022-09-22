<?php
namespace MediaWiki\Extension\Ark\DataMaps\API;

use ApiBase;
use ApiResult;
use Title;
use WikiPage;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use Wikimedia\ParamValidator\ParamValidator;
use ObjectCache;
use MediaWiki\Extension\Ark\DataMaps\DataMapsConfig;
use MediaWiki\Extension\Ark\DataMaps\Content\DataMapContent;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MarkerSpec;
use MediaWiki\Extension\Ark\DataMaps\Rendering\MarkerProcessor;
use MediaWiki\Extension\Ark\DataMaps\Rendering\DataMapEmbedRenderer;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapFileUtils;
use ParserOptions;

class ApiQueryDataMapEndpoint extends ApiBase {
    // This value is a part of every cache key produced by this endpoint. It should be raised only on API output changes and
    // cache management changes, including changes to the MarkerProcessor class.
    //
    // Prior to v0.10.0, this has always been the last minor version number to require this procedure. If a bump was required in
    // a patch, it was expected that this number is increased anyway (going out of sync with versioning).
    //
    // Since v0.10.0:
    // - if major version becomes higher than zero, the first digit should be the major version;
    // - next two digits should be the minor version;
    // - next two digits should be the patch version, or two zeroes instead.
    const GENERATION = 1000;

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
                /* DEPRECATED(v0.12.0:v0.13.0): use layers */
                ParamValidator::PARAM_TYPE => 'string',
                ParamValidator::PARAM_REQUIRED => false,
                ParamValidator::PARAM_DEPRECATED => true,
            ],
            'layers' => [
                ParamValidator::PARAM_TYPE => 'string',
                ParamValidator::PARAM_REQUIRED => false,
                ParamValidator::PARAM_ISMULTI => true,
            ],
        ];
    }

	public function isInternal() {
		return true;
	}

    public function execute() {
        $timeStart = 0;
        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $timeStart = hrtime( true );
        }

        $params = $this->extractRequestParams();

        // Migrate filter parameter onto layers
        if ( isset( $params['filter'] ) && !empty( $params['filter'] ) ) {
            $params['layers'] = explode( '|', $params['filter'] );
        }

        // Configure browser-side caching recommendations
		$this->getMain()->setCacheMode( 'public' );
        $this->getMain()->setCacheMaxAge( 24 * 60 * 60 );

        $response = null;
        if ( DataMapsConfig::getApiCacheTTL() <= 0 ) {
            // Cache expiry time is zero or lower, bypass caching
            $response = $this->doProcessing( $params );
        } else {
            $response = $this->doProcessingCached( $params );
        }
		
        $this->doPostProcessing( $params, $response );

        $this->getResult()->addValue( null, 'query', $response );

        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $this->getResult()->addValue( null, 'responseTime', hrtime( true ) - $timeStart );
        }
    }

    private function getRevisionFromParams( $params ) {
        // Retrieve latest revision by title
        $title = Title::newFromText( $params['title'], DataMapsConfig::getNamespace() );
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

    private function doProcessingCached( $params ): array {
        $cacheExpiryTime = DataMapsConfig::getApiCacheTTL();

        // Retrieve the specified cache instance
        $cache = ObjectCache::getInstance( DataMapsConfig::getApiCacheType() );

        // Build the cache key from an identifier, title parameter and revision ID parameter
        $revid = isset( $params['revid'] ) ? $params['revid'] : -1;
        $cacheKey = $cache->makeKey( 'ARKDataMapQuery', self::GENERATION, $params['title'], $revid );

        // Try to retrieve the response
        $response = $cache->get( $cacheKey );
        if ( $response === false ) {
            // Response not cached, process the data in this request
            $response = $this->doProcessing( $params );

            // If TTL extension is allowed, store an internal timestamp
            if ( DataMapsConfig::shouldExtendApiCacheTTL() ) {
                $response['refreshedAt'] = time();
            }

            // Write to cache
            $cache->set( $cacheKey, $response, $cacheExpiryTime );
        } else {
            // Response cached, check if TTL should be extended and do it
            if ( DataMapsConfig::shouldExtendApiCacheTTL() && isset( $response['refreshedAt'] ) ) {
                $ttlThreshold = $cacheExpiryTime - DataMapsConfig::getApiCacheTTLExtensionThreshold();
                if ( time() - $response['refreshedAt'] >= $ttlThreshold ) {
                    $response['refreshedAt'] = time();
                    $cache->set( $cacheKey, $response, DataMapsConfig::getApiCacheTTLExtensionValue() );
                }
            }
        }

        // Remove the internal TTL extension timestamp
        if ( isset( $response['refreshedAt'] ) && !DataMapsConfig::shouldApiReturnProcessingTime() ) {
            unset( $response['refreshedAt'] );
        }

        return $response;
    }

    private function doProcessing( $params ): array {
        $timeStart = 0;
        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $timeStart = hrtime( true );
        }

        // Retrieve the content
        list( $title, $revision ) = $this->getRevisionFromParams( $params );
        $content = $revision->getContent( SlotRecord::MAIN, RevisionRecord::FOR_PUBLIC, null );

        // Make sure the page is a data map
        if ( !( $content instanceof DataMapContent ) ) {
            $this->dieWithError( [ 'contentmodel-mismatch', $content->getModel(), 'datamap' ] );
        }

        // Cast content to a data model
        $dataMap = $content->asModel();

        // Response skeleton
        $response = [
            'title' => $title->getFullText(),
            'revisionId' => $revision->getId()
        ];

        // Have a MarkerProcessor convert the data
        $processor = new MarkerProcessor( $title, $dataMap, null );
        $response['markers'] = $processor->processAll();

        // Armour any API metadata in $response
        $response = ApiResult::addMetadataToResultVars( $response, false );

        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $response['processingTime'] = hrtime( true ) - $timeStart;
            $response['parserTime'] = $processor->timeInParser;
        }

        return $response;
    }

    private function doPostProcessing( $params, array &$data ) {
        // Filter markers by layers
        if ( isset( $params['layers'] ) ) {
            foreach ( array_keys( $data['markers'] ) as &$layers ) {
                if ( empty( array_intersect( $params['layers'], explode( ' ', $layers ) ) ) ) {
                    unset( $data['markers'][$layers] );
                }
            }
        }
    } 
}