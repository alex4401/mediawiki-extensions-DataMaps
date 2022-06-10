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
		$this->getMain()->setCacheMode( 'public' );
        $this->getMain()->setCacheMaxAge( 24 * 60 * 60 );

        $params = $this->extractRequestParams();

        list( $title, $revision ) = $this->getRevisionFromParams($params);
        $content = $revision->getContent( SlotRecord::MAIN, RevisionRecord::FOR_PUBLIC, null );

        if ( !($content instanceof DataMapContent) ) {
            $this->dieWithError( [ 'contentmodel-mismatch', $content->getModel(), 'datamap' ] );
        }

        $data = $content->asModel()->getRawMarkers();
        $response = [
            'title' => $title->getFullText(),
            'revisionId' => $revision->getId(),
            'markers' => $data
        ];

        // Armour any API metadata in $response
        $data = ApiResult::addMetadataToResultVars( $response, false );

        $this->getResult()->addValue( null, 'query', $response );
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
}