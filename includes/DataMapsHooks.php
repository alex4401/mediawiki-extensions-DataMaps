<?php
namespace Ark\DataMaps;

use Title;
use Parser;

class DataMapsHooks {
    public static function onRegistration(): bool {
        define( 'ARK_CONTENT_MODEL_DATAMAP', 'datamap' );
        return true;
    }
    
    public static function onParserFirstCallInit( Parser $parser ) {
        $parser->setFunctionHook(
            'pf-embed-data-map', [ Rendering\ParserFunction_EmbedDataMap::class, 'run' ],
            SFH_NO_HASH
        );
    }

	private static function isDocPage( Title $title ) {
        global $wgArkDataNamespace;

        // Based on Scribunto
		$docPage = wfMessage( 'datamap-doc-page-name' )->inContentLanguage();
		if ( $docPage->isDisabled() ) {
			return false;
		}

		// Canonicalize the input pseudo-title. The unreplaced "$1" shouldn't cause a problem.
		$docTitle = Title::newFromText( $docPage->plain() );
		if ( !$docTitle ) {
			return false;
		}
		$docPage = $docTitle->getPrefixedText();

		// Make it into a regex, and match it against the input title
		$docPage = str_replace( '\\$1', '(.+)', preg_quote( $docPage, '/' ) );
		if ( preg_match( "/^$docPage$/", $title->getPrefixedText(), $m ) ) {
			return Title::makeTitleSafe( $wgArkDataNamespace, $m[1] ) !== null;
		} else {
			return false;
		}
	}

	public static function contentHandlerDefaultModelFor( Title $title, &$model ) {
        global $wgArkDataNamespace;

		if ( $title->getNamespace() === $wgArkDataNamespace && !self::isDocPage( $title ) ) {
            $prefix = wfMessage( 'datamap-standard-title-prefix' )->text();
            if ( $prefix !== '-' && str_starts_with( $title->getText(), $prefix ) ) {
			    $model = ARK_CONTENT_MODEL_DATAMAP;
            }
		}
		return true;
	}

	public static function getCodeLanguage( Title $title, &$languageCode ) {
		if ( $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP ) ) {
			$languageCode = 'json';
		}

		return true;
	}
}
