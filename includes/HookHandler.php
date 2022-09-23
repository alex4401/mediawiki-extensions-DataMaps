<?php
namespace MediaWiki\Extension\Ark\DataMaps;

use Title;
use Linker;

class HookHandler implements
	\MediaWiki\Hook\ParserFirstCallInitHook,
	\MediaWiki\Revision\Hook\ContentHandlerDefaultModelForHook
{
    public static function onRegistration(): bool {
        define( 'ARK_CONTENT_MODEL_DATAMAP', 'datamap' );
        return true;
    }
    
    public function onParserFirstCallInit( $parser ) {
        $parser->setFunctionHook(
            'pf-embed-data-map', [ Rendering\ParserFunction_EmbedDataMap::class, 'run' ],
            SFH_NO_HASH
        );
    }

	private static function isDocPage( Title $title ) {
		$docPage = wfMessage( 'datamap-doc-page-suffix' )->inContentLanguage();
		return !$docPage->isDisabled() && str_ends_with( $title->getPrefixedText(), $docPage->plain() );
	}

	public function onContentHandlerDefaultModelFor( $title, &$model ) {
		if ( $title->getNamespace() === ExtensionConfig::getNamespace() && !self::isDocPage( $title ) ) {
            $prefix = wfMessage( 'datamap-standard-title-prefix' )->inContentLanguage();
            if ( $prefix !== '-' && str_starts_with( $title->getText(), $prefix->plain() ) ) {
			    $model = ARK_CONTENT_MODEL_DATAMAP;
            }
		}
		return true;
	}

	public static function onCodeEditorGetPageLanguage( Title $title, &$languageCode ) {
		if ( $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP ) ) {
			$languageCode = 'json';
		}
		return true;
	}
}
