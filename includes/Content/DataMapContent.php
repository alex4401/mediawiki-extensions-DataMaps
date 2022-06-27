<?php
namespace Ark\DataMaps\Content;

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
use Ark\DataMaps\Rendering\DataMapEmbedRenderer;
use Ark\DataMaps\Rendering\DataMapRenderOptions;
use Ark\DataMaps\Data\DataMapSpec;

class DataMapContent extends DataMapContentBase {
	public function __construct( $text, $modelId = ARK_CONTENT_MODEL_DATAMAP ) {
		parent::__construct( $text, $modelId );
	}

	public function asModel(): DataMapSpec {
		return new DataMapSpec( $this->getData()->getValue() );
	}

	public function isMixin(): bool {
		return !isset( $this->getData()->getValue()->markers );
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
