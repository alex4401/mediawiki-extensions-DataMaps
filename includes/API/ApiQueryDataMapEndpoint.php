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
use Ark\DataMaps\Content\DataMapContent;
use Ark\DataMaps\Data\DataMapSpec;
use Ark\DataMaps\Data\DataMapMarkerSpec;
use Ark\DataMaps\Rendering\DataMapEmbedRenderer;
use ParserOptions;

class ApiQueryDataMapEndpoint extends ApiBase {
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
        ];
    }

    public function execute() {
        global $wgArkDataMapDebugApiProcessingTime;
        $timeStart = 0;
        if ( $wgArkDataMapDebugApiProcessingTime ) {
            $timeStart = hrtime( true );
        }

		$this->getMain()->setCacheMode( 'public' );
        $this->getMain()->setCacheMaxAge( 24 * 60 * 60 );

        $params = $this->extractRequestParams();

        list( $title, $revision ) = $this->getRevisionFromParams( $params );
        $content = $revision->getContent( SlotRecord::MAIN, RevisionRecord::FOR_PUBLIC, null );

        if ( !($content instanceof DataMapContent) ) {
            $this->dieWithError( [ 'contentmodel-mismatch', $content->getModel(), 'datamap' ] );
        }

        $dataMap = $content->asModel();
        $response = [
            'title' => $title->getFullText(),
            'revisionId' => $revision->getId(),
            'markers' => $this->processMarkers( $title, $dataMap )
        ];

        // Armour any API metadata in $response
        $response = ApiResult::addMetadataToResultVars( $response, false );

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

    private function processMarkers( Title $title, DataMapSpec $dataMap ): array {
        $results = [];
		$parser = MediaWikiServices::getInstance()->getParser();

        $dataMap->iterateRawMarkerMap( function( string $layers, array $rawMarkerCollection ) use ( &$results, &$title, &$parser ) {
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

                $converted = [
                    'lat' => $marker->getLatitude(),
                    'long' => $marker->getLongitude()
                ];

                if ( $marker->getLabel() != null ) {
                    $converted['label'] = $marker->getLabel();
                }

                if ( $marker->getDescription() != null ) {
                    if ( $marker->isDescriptionWikitext() ) {
                        $converted['description'] =
                            $parser->parse( $marker->getDescription(), $title, $parserOptions, false, true )
                                ->getText( [ 'unwrap' => true ] );
                    } else {
                        $converted['description'] = $marker->getDescription();
                    }
                }

                if ( $marker->getPopupImage() != null ) {
                    $converted['image'] = DataMapEmbedRenderer::getIconUrl( $marker->getPopupImage() );
                }

                if ( $marker->getRelatedArticle() != null ) {
                    $converted['article'] = $marker->getRelatedArticle();
                }

                $subResults[] = $converted;
            }

            $results[$layers] = $subResults;
        } );

        return $results;
    }
}