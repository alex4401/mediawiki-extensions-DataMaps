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

class DataMapContent extends JsonContent {

	public function __construct( $text, $modelId = ARK_CONTENT_MODEL_DATAMAP ) {
		parent::__construct( $text, $modelId );
	}

    const NUMBER_RE = '[+-]?\d+(\.\d+)?([eE][-+]?\d+)?|true|false';
    # Reduce 2-12 numbers in an array onto a single line
    const JOIN_MULTIPLE_NUMBERS_RE = '(\n\s+)(' . self::NUMBER_RE . '),(?:\n\s+(?:' . self::NUMBER_RE . '|null|"[^"\n\t]*"),?){1,12}';
    # Reduce short arrays of strings onto a single line
    const JOIN_MULTIPLE_STRINGS_RE = '\[((?:\n\s+".{1,30}",?\s*$){1,4})\n\s+\]';
    # Reduces dict fields with only a single line of content (including previously joined multiple fields) to a single line
    const COLLAPSE_SINGLE_LINE_DICT_RE = '/\{\n\s+("\w+": [^}\n\]]{1,120})\n\s+\}/';
    # Reduce arrays with only a single line of content (including previously joined multiple fields) to a single line
    const COLLAPSE_SINGLE_LINE_ARRAY_RE = '/\[\s+(.+)\s+\]/';
	# Sets of named fields that should be combined onto a single line
	const JOIN_LINE_FIELDS = array( 'left|right|top|bottom', 'name|icon', 'lat|long' );

	public function beautifyJSON() {
		$out = FormatJson::encode( $this->getData()->getValue(), true, FormatJson::UTF8_OK );

		foreach (self::JOIN_LINE_FIELDS as $term) {
			$part = '(?:("(?:' . $term . ')": [^,\n]+,?))';
			$fieldCount = substr_count($term, '|') + 1;
			$full = '/' . join('\s+', array_fill(0, $fieldCount, $part)) . '(\s+)/';
			$subs = join(' ', array_map(fn($n) => '$' . $n, range(1, $fieldCount))) . "$" . ($fieldCount+1);
			$out = preg_replace($full, $subs, $out);
		}

		$out = preg_replace(self::COLLAPSE_SINGLE_LINE_DICT_RE, '{ $1 }', $out);
		$out = preg_replace(self::COLLAPSE_SINGLE_LINE_ARRAY_RE, '[ $1 ]', $out);

		return $out;
	}

	public function asModel(): DataMapSpec {
		return new DataMapSpec( $this->getData()->getValue() );
	}

	/**
	 * Return the Title for the documentation page
	 *
	 * @param Title $title
	 * @return Title|null
	 */
	public static function getDocPage( Title $title ) {
		$docPage = wfMessage( 'datamap-doc-page-name', $title->getText() )->inContentLanguage();
		if ( $docPage->isDisabled() ) {
			return null;
		}

		return Title::newFromText( $docPage->plain() );
	}

	public function getEmbedRenderer( Title $title, Parser $parser ): DataMapEmbedRenderer {
		return new DataMapEmbedRenderer( $title, $this->asModel(), $parser );
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml, ParserOutput &$output ) {
		$parser = MediaWikiServices::getInstance()->getParser();
		$output = new ParserOutput();

		if ( !$generateHtml ) {
			return $output;
		}

		// Get documentation, if any
		$doc = self::getDocPage( $title );
		if ( $doc ) {
			$msg = wfMessage(
				$doc->exists() ? 'datamap-doc-page-show' : 'datamap-doc-page-does-not-exist',
				$doc->getPrefixedText()
			)->inContentLanguage();

			if ( !$msg->isDisabled() ) {
				// We need the ParserOutput for categories and such, so we can't use $msg->parse().
				$docViewLang = $doc->getPageViewLanguage();
				$dir = $docViewLang->getDir();

				// Code is forced to be ltr, but the documentation can be rtl. Correct direction class is needed for correct
				// formatting. The possible classes are mw-content-ltr or mw-content-rtl
				$dirClass = "mw-content-$dir";

				$docWikitext = Html::rawElement(
					'div',
					[
						'lang' => $docViewLang->getHtmlCode(),
						'dir' => $dir,
						'class' => $dirClass,
					],
					"\n" . $msg->plain() . "\n"
				);

				if ( $options->getTargetLanguage() === null ) {
					$options->setTargetLanguage( $doc->getPageLanguage() );
				}

				$output = $parser->parse( $docWikitext, $title, $options, true, true, $revId );
			}

			// Mark the doc page as a transclusion, so we get purged when it changes.
			$output->addTemplate( $doc, $doc->getArticleID(), $doc->getLatestRevID() );
		}

		$embed = $this->getEmbedRenderer( $title, $parser );
		$embed->prepareOutput( $output );
		$output->setText( $output->getRawText() . $embed->getHtml( new DataMapRenderOptions() ) );

		return $output;
	}
}
