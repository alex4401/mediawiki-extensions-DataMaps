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
    const GENERATION = 8;

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
        $cacheExpiryTime = DataMapsConfig::getApiCacheExpiryTime();

        $timeStart = 0;
        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $timeStart = hrtime( true );
        }

		$this->getMain()->setCacheMode( 'public' );
        $this->getMain()->setCacheMaxAge( 24 * 60 * 60 );

        $params = $this->extractRequestParams();

        $response = null;
        if ( $cacheExpiryTime <= 0 ) {
            // Cache expiry time is zero or lower, bypass caching
            $response = $this->executeInternal( $params );
        } else {
            // Retrieve the specified cache instance
            $cache = ObjectCache::getInstance( DataMapsConfig::getApiCacheType() );
            // Build the cache key from an identifier, title parameter and revision ID parameter
            $revid = isset( $params['revid'] ) ? $params['revid'] : -1;
            $cacheKey = $cache->makeKey( 'ARKDataMapQuery', self::GENERATION, $params['title'], $revid,
                isset( $params['filter'] ) ? $params['filter'] : '' );
            // Try to retrieve the response
            $response = $cache->get( $cacheKey );
            if ( $response === false ) {
                // Response not cached, process the data in this request and write to cache
                $response = $this->executeInternal( $params );
                $cache->set( $cacheKey, $response, $cacheExpiryTime );
            }
        }
		
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

    private function executeInternal( $params ): array {
        $timeStart = 0;
        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $timeStart = hrtime( true );
        }

        list( $title, $revision ) = $this->getRevisionFromParams( $params );
        $content = $revision->getContent( SlotRecord::MAIN, RevisionRecord::FOR_PUBLIC, null );

        if ( !( $content instanceof DataMapContent ) ) {
            $this->dieWithError( [ 'contentmodel-mismatch', $content->getModel(), 'datamap' ] );
        }

        $dataMap = $content->asModel();
        $response = [
            'title' => $title->getFullText(),
            'revisionId' => $revision->getId()
        ];

        // Extract filters from the request parameters
        $filter = null;
        if ( isset( $params['filter'] ) && !empty( $params['filter'] ) ) {
            $filter = explode( '|', $params['filter'] );
        }

        // Have a MarkerProcessor convert the data
        $processor = new MarkerProcessor( $title, $dataMap, $filter );
        $response['markers'] = $processor->processAll();

        // Armour any API metadata in $response
        $response = ApiResult::addMetadataToResultVars( $response, false );

        if ( DataMapsConfig::shouldApiReturnProcessingTime() ) {
            $response['processingTime'] = hrtime( true ) - $timeStart;
            $response['parserTime'] = $processor->timeInParser;
        }

        return $response;
    }
}