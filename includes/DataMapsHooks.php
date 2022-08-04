<?php
namespace MediaWiki\Extension\Ark\DataMaps;

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
		$docPage = wfMessage( 'datamap-doc-page-suffix' )->inContentLanguage();
		return !$docPage->isDisabled() && str_ends_with( $title->getPrefixedText(), $docPage->plain() );
	}

	public static function contentHandlerDefaultModelFor( Title $title, &$model ) {
		if ( $title->getNamespace() === DataMapsConfig::getNamespace() && !self::isDocPage( $title ) ) {
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
