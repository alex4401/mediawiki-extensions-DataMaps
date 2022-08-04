<?php
namespace MediaWiki\Extension\Ark\DataMaps\Content;

use MediaWiki\MediaWikiServices;
use FormatJson;
use JsonContent;
use Parser;
use ParserOptions;
use ParserOutput;
use OutputPage;
use Title;
use Html;
use PPFrame;
use Status;
use stdClass;
use WikiPage;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Extension\Ark\DataMaps\DataMapsConfig;
use MediaWiki\Extension\Ark\DataMaps\Rendering\DataMapEmbedRenderer;
use MediaWiki\Extension\Ark\DataMaps\Rendering\DataMapRenderOptions;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\DataModelMixinTransformer;

class DataMapContent extends DataMapContentBase {
	const LERR_NOT_FOUND = 1;
	const LERR_NOT_DATAMAP = 2;

	private ?DataMapSpec $modelCached = null;

	public function __construct( $text, $modelId = ARK_CONTENT_MODEL_DATAMAP ) {
		parent::__construct( $text, $modelId );
	}

	public static function loadPage( Title $title ) {
        if ( !$title || !$title->exists() ) {
			return self::LERR_NOT_FOUND;
        }

        $mapPage = WikiPage::factory( $title );
        $content = $mapPage->getContent( RevisionRecord::RAW );

        if ( !( $content instanceof DataMapContent ) ) {
			return self::LERR_NOT_DATAMAP;
        }

		return $content;
	}

	private function mergeMixins( stdClass $main ) {
		if ( !isset( $main->mixins ) ) {
			return $main;
		}

		$finalMixin = null;
		foreach ( $main->mixins as &$mixinName ) {
			$title = Title::makeTitleSafe( DataMapsConfig::getNamespace(), $mixinName );
        	$mixinPage = DataMapContent::loadPage( $title );

			// Mixin failed to load, skip it. There's no way for us to throw an error at this stage without crashing the whole
			// request. However, validation can catch this most of the time.
			if ( is_numeric( $mixinPage ) ) {
				continue;
			}
			$mixin = $mixinPage->getData()->getValue();
			if ( $mixin == null ) {
				continue;
			}
			
			if ( $finalMixin === null ) {
				// First mixin, keep unmodified
				$finalMixin = $mixin;
			} else {
				// Nth mixin, merge onto collective
				$finalMixin = DataModelMixinTransformer::mergeTwoObjects( $finalMixin, $mixin );
			}
		}

		if ( $finalMixin !== null ) {
			// Merge main onto collective
			$main = DataModelMixinTransformer::mergeTwoObjects( $finalMixin, $main );
		}

		return $main;
	}

	public function asModel(): DataMapSpec {
		if ( $this->modelCached === null ) {
			$this->modelCached = new DataMapSpec( $this->mergeMixins( $this->getData()->getValue() ) );
		}
		return $this->modelCached;
	}

	public function isMixin(): bool {
		return !isset( $this->getData()->getValue()->markers );
	}
	
	public function validateBeforeSave( Status $status ) {
		parent::validateBeforeSave( $status );
		$this->asModel()->validate( $status );
	}

	public function getEmbedRenderer( Title $title, Parser $parser ): DataMapEmbedRenderer {
		return new DataMapEmbedRenderer( $title, $this->asModel(), $parser );
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml, ParserOutput &$output ) {
		$output = parent::fillParserOutput( $title, $revId, $options, $generateHtml, $output );

		if ( !$generateHtml ) {
			return $output;
		}

		if ( !$this->isMixin() ) {
			$parser = MediaWikiServices::getInstance()->getParser();
			$embed = $this->getEmbedRenderer( $title, $parser );
			$embed->prepareOutput( $output );
			$output->setText( $output->getRawText() . $embed->getHtml( new DataMapRenderOptions() ) );
		}

		return $output;
	}
}
