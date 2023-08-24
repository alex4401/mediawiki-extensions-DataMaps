<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

use MediaWiki\Extension\DataMaps\Content\DataMapContent;
use MediaWiki\Extension\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use Parser;
use Title;

final class ParserFunction_EmbedDataMap {
    public static function run( Parser $parser ): array {
        $params = func_get_args();
        // We already know the parser
        array_shift( $params );

        $title = Title::makeTitleSafe( ExtensionConfig::getNamespaceId(), $params[0] );

        // Retrieve and validate options
        $options = self::getRenderOptions( $params );
        if ( is_string( $options ) ) {
            return self::wrapError( $options );
        }

        // Verify the page exists and is a data map
        // TODO: separate message if the page is of foreign format and can be ported
        $content = DataMapContent::loadPage( $title );
        if ( $content === DataMapContent::LERR_NOT_FOUND ) {
            return self::wrapError(
                wfMessage( 'datamap-error-pf-page-does-not-exist', wfEscapeWikiText( $title->getFullText() ) )
                    ->inContentLanguage()->escaped()
            );
        } elseif ( $content === DataMapContent::LERR_NOT_DATAMAP ) {
            return self::wrapError(
                wfMessage( 'datamap-error-pf-page-invalid-content-model', wfEscapeWikiText( $title->getFullText() ) )
                    ->inContentLanguage()->escaped()
            );
        } elseif ( !$content->getValidationStatus()->isOK() ) {
            $parser->addTrackingCategory( 'datamap-category-pages-including-broken-maps' );
            return self::wrapError(
                wfMessage( 'datamap-error-map-validation-fail', wfEscapeWikiText( $title->getFullText() ) )
                    ->inContentLanguage()->parse()
            );
        }

        $embed = $content->getEmbedRenderer( $title, $parser, $parser->getOutput() );
        $embed->prepareOutput();

        // Add the page to a tracking category
        $parser->addTrackingCategory( 'datamap-category-pages-including-maps' );
        // Register page's dependency on the data map
        $parser->getOutput()->addTemplate( $title, $title->getArticleId(),
            $parser->fetchCurrentRevisionRecordOfTitle( $title )->getId() );

        return [ $embed->getHtml( $options ), 'noparse' => true, 'isHTML' => true ];
    }

    private static function wrapError( string $text ): array {
        return [ '<strong class="error">' . $text . '</strong>', 'noparse' => true, 'isHTML' => true ];
    }

    /**
     * Extracts and validates options given to this parser function into an EmbedRenderOptions object.
     *
     * @param array $params
     * @return EmbedRenderOptions|string
     */
    private static function getRenderOptions( array $params ) {
        $result = new EmbedRenderOptions();

        foreach ( $params as $param ) {
            // TODO: should throw on unrecognised parameters

            $parts = explode( '=', $param, 2 );

            if ( count( $parts ) != 2 ) {
                continue;
            }
            $key = trim( $parts[0] );
            $value = trim( $parts[1] );

            switch ( $key ) {
                case 'filter':
                    $result->displayGroups = explode( ',', $value );
                    break;
                case 'max-width':
                    $result->maxWidthPx = intval( $value );
                    if ( $result->maxWidthPx <= 0 ) {
                        return wfMessage( 'datamap-error-pf-max-width-invalid' )->inContentLanguage()->escaped();
                    }
                    break;
            }
        }

        return $result;
    }
}
