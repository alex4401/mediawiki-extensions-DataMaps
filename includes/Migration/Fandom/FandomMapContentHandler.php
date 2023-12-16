<?php
namespace MediaWiki\Extension\DataMaps\Migration\Fandom;

use Content;
use Html;
use JsonContentHandler;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Extension\DataMaps\Constants;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use MediaWiki\Extension\DataMaps\Migration\ForeignMapContentHandler;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use stdClass;
use Title;

class FandomMapContentHandler extends JsonContentHandler {
    use ForeignMapContentHandler;

    public function __construct( $modelId = CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT ) {
        parent::__construct( $modelId, [ CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT ] );
    }

    protected function getContentClass() {
        return FandomMapContent::class;
    }
}
