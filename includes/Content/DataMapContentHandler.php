<?php
namespace MediaWiki\Extension\DataMaps\Content;

use Content;
use Html;
use JsonContentHandler;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use MediaWiki\Extension\DataMaps\Rendering\EmbedRenderOptions;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use Title;

class DataMapContentHandler extends JsonContentHandler {
    public function __construct( $modelId = ARK_CONTENT_MODEL_DATAMAP ) {
        parent::__construct( $modelId, [ ARK_CONTENT_MODEL_DATAMAP ] );
    }

    protected function getContentClass() {
        return DataMapContent::class;
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

    public function validateSave( Content $content, ValidationParams $validationParams ) {
        '@phan-var DataMapContent $content';
        return $content->getValidationStatus();
    }

    public static function getDocPage( Title $title ) {
        $docPage = wfMessage( 'datamap-doc-page-suffix' )->inContentLanguage();
        return $docPage->isDisabled() ? null : Title::newFromText( $title->getPrefixedText() . $docPage->plain() );
    }

    public function isParserCacheSupported() {
        return true;
    }

    protected function fillParserOutput( Content $content, ContentParseParams $cpoParams, ParserOutput &$parserOutput ) {
        '@phan-var DataMapContent $content';

        $pageRef = $cpoParams->getPage();
        $parserOptions = $cpoParams->getParserOptions();
        $shouldGenerateHtml = $cpoParams->getGenerateHtml();
        $isEditPreview = $parserOptions->getIsPreview();

        // If validation fails, do not render the map embed
        $validationStatus = $content->getValidationStatus();
        if ( !$validationStatus->isGood() ) {
            if ( $shouldGenerateHtml && $isEditPreview ) {
                // Edit preview, display a message box. This is something MediaWiki should be handling out of box though.
                $parserOutput->setText( Html::errorBox(
                    wfMessage( 'datamap-error-cannot-preview-validation-errors', $validationStatus->getMessage( false, false ) )
                ) );
            } else {
                // Add to a tracking category and display a message if HTML is requested
                MediaWikiServices::getInstance()->getTrackingCategories()
                    ->addTrackingCategory( $parserOutput, 'datamap-category-maps-failing-validation', $pageRef );
                if ( $shouldGenerateHtml ) {
                    $parserOutput->setText( Html::errorBox(
                        wfMessage( 'datamap-error-map-validation-fail-full', $validationStatus->getMessage( false, false ) )
                    ) );
                }
            }
            return;
        }

        // Get documentation, if any
        $doc = self::getDocPage( $cpoParams->getPage() );
        if ( $shouldGenerateHtml && $doc ) {
            $msg = wfMessage( $doc->exists() ? 'datamap-doc-page-show' : 'datamap-doc-page-does-not-exist',
                $doc->getPrefixedText() )->inContentLanguage();

            if ( !$msg->isDisabled() ) {
                // We need the ParserOutput for categories and such, so we can't use $msg->parse()
                $docViewLang = $doc->getPageViewLanguage();
                $dir = $docViewLang->getDir();

                $docWikitext = Html::rawElement(
                    'div',
                    [
                        'lang' => $docViewLang->getHtmlCode(),
                        'dir' => $dir,
                        'class' => "mw-content-$dir",
                    ],
                    "\n" . $msg->plain() . "\n"
                );

                if ( $parserOptions->getTargetLanguage() === null ) {
                    $parserOptions->setTargetLanguage( $doc->getPageLanguage() );
                }

                $parserOutput = MediaWikiServices::getInstance()->getParser()
                    ->parse( $docWikitext, $pageRef, $parserOptions, true, true, $cpoParams->getRevId() );
            }

            // Mark the doc page as a transclusion, so we get purged when it changes
            $parserOutput->addTemplate( $doc, $doc->getArticleID(), $doc->getLatestRevID() );
        }

        // Render the map if it isn't a mix-in
        if ( !$content->isMixin() ) {
            // Initialise the embed renderer
            $parser = MediaWikiServices::getInstance()->getParser();
            $embed = $content->getEmbedRenderer( $pageRef, $parser, $parserOutput, [
                'inlineData' => $isEditPreview
            ] );
            // Add metadata
            $embed->prepareOutput( $parserOutput );

            // Generate HTML if requested
            if ( $shouldGenerateHtml ) {
                $parserOutput->setText( $parserOutput->getRawText() . $embed->getHtml( new EmbedRenderOptions() ) );
            }
        } else {
            $parserOutput->setPageProperty( 'ext.datamaps.isMapMixin', true );
            $parserOutput->setPageProperty( 'ext.datamaps.isIneligibleForVE', true );
        }
    }
}
