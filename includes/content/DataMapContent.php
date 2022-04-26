<?php
use MediaWiki\MediaWikiServices;

class DataMapContent extends ArkFormattedJsonContent {

	public function __construct( $text, $modelId = ARK_CONTENT_MODEL_DATAMAP ) {
		parent::__construct( $text, $modelId );
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

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml, ParserOutput &$output ) {
		$parser = MediaWikiServices::getInstance()->getParser();

		$text = $this->getText();

		// Get documentation, if any
		$output = new ParserOutput();
		$doc = Scribunto::getDocPage( $title );
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
					// Line breaks are needed so that wikitext would be
					// appropriately isolated for correct parsing. See Bug 60664.
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

		if ( !$generateHtml ) {
			// We don't need the actual HTML
			$output->setText( '' );
			return $output;
		}

		// No GeSHi, or GeSHi can't parse it, use plain <pre>
		$output->setText( $output->getRawText() .
			"<pre class='mw-code mw-script' dir='ltr'>\n" .
			htmlspecialchars( $text ) .
			"\n</pre>\n"
		);

		return $output;
	}

}
