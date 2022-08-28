<?php
namespace MediaWiki\Extension\Ark\DataMaps;

use Title;
use Linker;
use ResourceLoader;
use ResourceLoaderFileModule;

class HookHandler implements
	\MediaWiki\Hook\ParserFirstCallInitHook,
	\MediaWiki\Revision\Hook\ContentHandlerDefaultModelForHook,
    \MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook
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
		if ( $title->getNamespace() === DataMapsConfig::getNamespace() && !self::isDocPage( $title ) ) {
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

	public function onResourceLoaderRegisterModules( ResourceLoader $resourceLoader ): void {
		global $wgDataMapsDebugLeafletJs;
        $resourceLoader->register( 'ext.ark.datamaps.leaflet.core', [
			'class' => ResourceLoaderFileModule::class,
			'scripts' => [
				'extensions/DataMaps/resources/vendor/leaflet/' . $wgDataMapsDebugLeafletJs . '.js'
			],
			'styles' => [
				'extensions/DataMaps/resources/vendor/leaflet/leaflet.css'
			],
			'targets' => [ 'desktop', 'mobile' ]
		] );
	}
}
