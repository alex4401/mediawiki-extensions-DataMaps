<?php
namespace MediaWiki\Extension\Ark\DataMaps\Rendering;

use Parser;
use Title;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Extension\Ark\DataMaps\ExtensionConfig;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\Ark\DataMaps\Content\DataMapContent;

final class ParserFunction_EmbedDataMap {
    public static function run( Parser $parser ): array {        
        $params = func_get_args();
		array_shift( $params ); // we know the parser already

        $title = Title::makeTitleSafe( ExtensionConfig::getNamespaceId(), $params[0] );
        $content = DataMapContent::loadPage( $title );
        if ( $content === DataMapContent::LERR_NOT_FOUND ) {
            $msg = wfMessage( 'datamap-error-pf-page-does-not-exist', wfEscapeWikiText( $title->getFullText() ) )
                ->inContentLanguage()->escaped();
            return [ '<strong class="error">' . $msg . '</strong>', 'noparse' => true ];
        } elseif ( $content === DataMapContent::LERR_NOT_DATAMAP ) {
            $msg = wfMessage( 'datamap-error-pf-page-invalid-content-model', wfEscapeWikiText( $title->getFullText() ) )
                ->inContentLanguage()->escaped();
            return [ '<strong class="error">' . $msg . '</strong>', 'noparse' => true ];
        }

        $options = self::getRenderOptions( $content->asModel(), $params );

        $embed = $content->getEmbedRenderer( $title, $parser, $parser->getOutput() );
		$embed->prepareOutput();

        // Add the page to a tracking category
        $parser->addTrackingCategory( 'datamap-category-pages-including-maps' );
        // Register page's dependency on the data map
        $parser->getOutput()->addTemplate( $title, $title->getArticleId(),
            $parser->fetchCurrentRevisionRecordOfTitle( $title )->getId() );

		return [ $embed->getHtml( $options ), 'noparse' => true, 'isHTML' => true ];
    }

    public static function getRenderOptions( DataMapSpec $data, array $params ): EmbedRenderOptions {
        $result = new EmbedRenderOptions();

		foreach ( $params as $param ) {
			$parts = explode( '=', $param, 2 );

			if ( count( $parts ) != 2 ) {
				continue;
			}
			$key = trim( $parts[0] );
			$value = trim( $parts[1] );
            
            if ( $key == 'filter' ) {
                $result->displayGroups = explode( ',', $value );
                // TODO: verify the markers are present on map
            }
        }
        
        return $result;
    }
}
