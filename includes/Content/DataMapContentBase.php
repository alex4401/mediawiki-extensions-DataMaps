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
use WikiPage;
use User;
use Status;
use MediaWiki\Extension\Ark\DataMaps\Rendering\DataMapEmbedRenderer;
use MediaWiki\Extension\Ark\DataMaps\Rendering\DataMapRenderOptions;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;

abstract class DataMapContentBase extends JsonContent {
    # Reduce 2-12 numbers in an array onto a single line
    const JOIN_MULTIPLE_NUMBERS_RE = '/(\n\s+)([+-]?\d+(\.\d+)?([eE][-+]?\d+)?|true|false),(?:\n\s+(?:[+-]?\d+(\.\d+)?([eE][-+]?\d+)?|true|false|null|"[^"\n\t]*"),?){1,12}/';
    # Reduce short arrays of strings onto a single line
    const JOIN_MULTIPLE_STRINGS_RE = '/\[((?:\n\s+".{1,30}",?\s*$){1,4})\n\s+\]/';
    # Reduces dict fields with only a single line of content (including previously joined multiple fields) to a single line
    const COLLAPSE_SINGLE_LINE_DICT_RE = '/\{\n\s+("\w+": [^}\n\]]{1,120})\n\s+\}/';
    # Reduce arrays with only a single line of content (including previously joined multiple fields) to a single line
    const COLLAPSE_SINGLE_LINE_ARRAY_RE = '/\[\s+(.+)\s+\]/';
	# Sets of named fields that should be combined onto a single line
	const JOIN_LINE_FIELDS = [
		'left|right|top|bottom',
		// Backgrounds
		'name|image',
		// Marker groups
		'fillColor|size',
		'fillColor|borderColor',
		'fillColor|borderColor|size',
		'fillColor|borderColor|borderWidth',
		'fillColor|borderColor|borderWidth|size',
		'icon|size',
		'name|icon',
		'name|icon|size',
		'name|fillColor|size',
		'name|fillColor|size|icon',
		'article|canDismiss',
		// Markers
		'lat|long',
		'article|popupImage',
		'lat|long|article',
		'lat|long|article|popupImage',
		'lat|long|popupImage'
	];

	public function beautifyJSON() {
		$out = FormatJson::encode( $this->getData()->getValue(), true, FormatJson::UTF8_OK );

		foreach (self::JOIN_LINE_FIELDS as $term) {
			$part = '(?:("(?:' . $term . ')": [^,\n]+,?))';
			$fieldCount = substr_count($term, '|') + 1;
			$full = '/' . join('\s+', array_fill(0, $fieldCount, $part)) . '(\s+)/';
			$subs = join(' ', array_map(fn($n) => '$' . $n, range(1, $fieldCount))) . "$" . ($fieldCount+1);
			$out = preg_replace($full, $subs, $out);
		}

		$out = preg_replace_callback(self::JOIN_MULTIPLE_NUMBERS_RE, function ( array $matches ) {
			$txt = $matches[0];
			$txt = preg_replace( '/\s*\n\s+/', '', $txt );
			$txt = str_replace( ',', ', ', $txt );
			return $matches[1] . $txt;
		}, $out);
		$out = preg_replace(self::COLLAPSE_SINGLE_LINE_DICT_RE, '{ $1 }', $out);
		$out = preg_replace(self::COLLAPSE_SINGLE_LINE_ARRAY_RE, '[ $1 ]', $out);

		return $out;
	}
	
	public function validateBeforeSave( Status $status ) {
		if ( !$this->isValid() ) {
			$status->fatal( 'datamap-error-validate-invalid-json' );
		}
	}

	public function prepareSave( WikiPage $page, $flags, $parentRevId, User $user ) {
		$status = new Status();
		$this->validateBeforeSave( $status );
		return $status;
	}

	/**
	 * Return the Title for the documentation page
	 *
	 * @param Title $title
	 * @return Title|null
	 */
	public static function getDocPage( Title $title ) {
		$docPage = wfMessage( 'datamap-doc-page-name', $title->getNsText(), $title->getText() )->inContentLanguage();
		if ( $docPage->isDisabled() ) {
			return null;
		}

		return Title::newFromText( $docPage->plain() );
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml, ParserOutput &$output ) {
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

				$parser = MediaWikiServices::getInstance()->getParser();
				$output = $parser->parse( $docWikitext, $title, $options, true, true, $revId );
			}

			// Mark the doc page as a transclusion, so we get purged when it changes.
			$output->addTemplate( $doc, $doc->getArticleID(), $doc->getLatestRevID() );
		}

		return $output;
	}
}
