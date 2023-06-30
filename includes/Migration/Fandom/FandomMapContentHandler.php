<?php
namespace MediaWiki\Extension\DataMaps\Migration\Fandom;

use Content;
use Html;
use JsonContentHandler;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Extension\DataMaps\Constants;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use MediaWiki\Extension\DataMaps\Rendering\EmbedRenderOptions;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use stdClass;
use Title;

class FandomMapContentHandler extends JsonContentHandler {
    public function __construct( $modelId = CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT ) {
        parent::__construct( $modelId, [ CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT ] );
    }

    protected function getContentClass() {
        return FandomMapContent::class;
    }

    /**
     * Only allow this content handler to be used in the configured data namespace
     */
    public function canBeUsedOn( Title $title ) {
        if ( $title->getNamespace() !== ExtensionConfig::getNamespaceId() ) {
            return false;
        }

        return parent::canBeUsedOn( $title );
    }

    protected function fillParserOutput( Content $content, ContentParseParams $cpoParams, ParserOutput &$parserOutput ) {
        '@phan-var FandomMapContent $content';

        $pageRef = $cpoParams->getPage();
        $parserOptions = $cpoParams->getParserOptions();
        $shouldGenerateHtml = $cpoParams->getGenerateHtml();
        $isEditPreview = $parserOptions->getIsPreview();
        $parserOutput = new ParserOutput();

        // Initialise the text to an empty string if HTML was requested; this'll reduce the amount of accidental getRawText()s
        // on nulls
        if ( $shouldGenerateHtml ) {
            $parserOutput->setText( 'TODO: This will eventually allow conversion.' );
        }
    }
}
