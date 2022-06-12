<?php
namespace Ark\DataMaps\Rendering;

use Parser;
use PPFrame;
use Title;
use WikiPage;
use MediaWiki\Revision\RevisionRecord;
use Ark\DataMaps\Content\DataMapContent;

final class ParserFunction_EmbedDataMap {
    public static function run( Parser $parser ): array {
		global $wgOut;
		global $wgArkDataNamespace;
        
        $params = func_get_args();
		array_shift( $params ); // we know the parser already

        $title = Title::makeTitleSafe( $wgArkDataNamespace, $params[0] );

        if ( !$title || !$title->exists() ) {
            $msg = wfMessage( 'datamap-error-pf-page-does-not-exist', wfEscapeWikiText( $title->getFullText() ) )
                ->inContentLanguage()->escaped();
            return [ '<strong class="error">' . $msg . '</strong>', 'noparse' => true ];
        }

        $mapPage = WikiPage::factory( $title );
        $content = $mapPage->getContent( RevisionRecord::RAW );

        if ( !($content instanceof DataMapContent) ) {
            $msg = wfMessage( 'datamap-error-pf-page-invalid-content-model', wfEscapeWikiText( $title->getFullText() ) )
                ->inContentLanguage()->escaped();
            return [ '<strong class="error">' . $msg . '</strong>', 'noparse' => true ];
        } 

        $options = self::getRenderOptions( $params );

        $embed = $content->getEmbedRenderer( $title, $parser );
		$embed->prepareOutput( $parser->getOutput() );

        // Add the page to a tracking category
        $parser->addTrackingCategory( 'datamap-category-pages-including-maps' );
        // Register page's dependency on the data map
        $parser->getOutput()->addTemplate( $title, $title->getArticleId(), $parser->fetchCurrentRevisionRecordOfTitle( $title )->getId() );

		return [ $embed->getHtml( $options ), 'noparse' => true, 'isHTML' => true ];
    }

    public static function getRenderOptions( array $params ): DataMapRenderOptions {
        $result = new DataMapRenderOptions();

		foreach ( $params as $param ) {
			$parts = explode( '=', $param, 2 );

			if ( count( $parts ) != 2 ) {
				continue;
			}
			$key = trim( $parts[0] );
			$value = trim( $parts[1] );

            if ( $key == 'title' ) {
                if ($value == 'none') {
                    $result->displayTitle = false;
                } else {
                    $result->displayTitle = true;
                    $result->titleOverride = $value;
                }
            }
        }
        
        return $result;
    }
}
