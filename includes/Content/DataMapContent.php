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
use MediaWiki\Extension\Ark\DataMaps\ExtensionConfig;
use MediaWiki\Extension\Ark\DataMaps\Rendering\EmbedRenderer;
use MediaWiki\Extension\Ark\DataMaps\Rendering\EmbedRenderOptions;
use MediaWiki\Extension\Ark\DataMaps\Rendering\MarkerProcessor;
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

		// Copy the mixins list to prevent bad behaviour when merging occurs. Mixins should be always stated explicitly.
		$mixins = $main->mixins;

		$finalMixin = null;
		foreach ( $mixins as &$mixinName ) {
			$title = Title::makeTitleSafe( ExtensionConfig::getNamespaceId(), $mixinName );
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

		// Remove $mixin field
		if ( isset( $main->{'$mixin'} ) ) {
			unset( $main->{'$mixin'} );
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
		return DataMapSpec::staticIsMixin( $this->getData()->getValue() );
	}
	
	public function validateBeforeSave( Status $status ) {
		parent::validateBeforeSave( $status );
		if ( $this->isValid() ) {
			$this->asModel()->validate( $status );
		}
	}

	public function getEmbedRenderer( Title $title, Parser $parser, ParserOutput $parserOutput, bool $useInlineData = false,
		bool $forVisualEditor = false ): EmbedRenderer {
		return new EmbedRenderer( $title, $this->asModel(), $parser, $parserOutput, $useInlineData, $forVisualEditor );
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml, ParserOutput &$output ) {
		$output = parent::fillParserOutput( $title, $revId, $options, $generateHtml, $output );

		if ( !$this->isMixin() ) {
			$isVisualEditor = $options->getOption( 'isMapVisualEditor' );

			if ( $options->getIsPreview() && $generateHtml ) {
				// If previewing an edit, run validation and end early on failure
				$status = new Status();
				$this->validateBeforeSave( $status );
				if ( !$status->isOK() ) {
					$output->setText( $output->getRawText() . Html::errorBox(
						wfMessage(
							'datamap-error-cannot-' . ( $isVisualEditor ? 'open-ve' : 'preview' ) . '-validation-errors',
							$status->getMessage( false, false )
						)
					) );
					return $output;
				}
			}

			$parser = MediaWikiServices::getInstance()->getParser();
			$embed = $this->getEmbedRenderer( $title, $parser, $output, $options->getIsPreview(),
				$isVisualEditor );
			$embed->prepareOutput( $output );

			if ( $generateHtml ) {
				$output->setText( $output->getRawText() . $embed->getHtml( new EmbedRenderOptions() ) );
			}
		} else {
			$output->setProperty( 'ext.datamaps.isMapMixin', true );
			$output->setProperty( 'ext.datamaps.isIneligibleForVE', true );
		}

		return $output;
	}
}
