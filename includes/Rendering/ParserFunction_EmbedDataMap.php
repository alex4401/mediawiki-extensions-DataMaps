<?php
namespace Ark\DataMaps\Rendering;

use Parser;
use PPFrame;
use Title;
use WikiPage;
use MediaWiki\Revision\RevisionRecord;
use Ark\DataMaps\Content\DataMapContent;

final class ParserFunction_EmbedDataMap {
    public function run( Parser $parser, PPFrame $frame, array $args ): array {
		global $wgOut;
		global $wgArkDataNamespace;

        $title = Title::makeTitleSafe( $wgArkDataNamespace, $args[0] );

        if ( !$title->exists() ) {
            $msg = wfMessage( 'datamap-error-pf-page-does-not-exist', $title->getFullText() )
                ->inContentLanguage()->escaped();
            return '<strong class="error">' . $msg . '</strong>';
        }

        $mapPage = WikiPage::factory( $title );
        $content = $mapPage->getContent( RevisionRecord::RAW );

        if ( !($content instanceof DataMapContent) ) {
            $msg = wfMessage( 'datamap-error-pf-page-invalid-content-model', $title->getFullText() )
                ->inContentLanguage()->escaped();
            return '<strong class="error">' . $msg . '</strong>';
        } 

        $embed = $content->getEmbedRenderer( $title, $parser, $frame );
		$embed->prepareOutput( $parser->getOutput() );

        $parser->addTrackingCategory( 'datamap-category-pages-including-maps' );

		return [ $embed->getHtml(), 'noparse' => true, 'isHTML' => true ];
    }
}