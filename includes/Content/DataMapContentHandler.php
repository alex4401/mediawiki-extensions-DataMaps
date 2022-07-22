<?php
namespace MediaWiki\Extension\Ark\DataMaps\Content;

use JsonContentHandler;
use Title;

class DataMapContentHandler extends JsonContentHandler {

	public function __construct( $modelId = ARK_CONTENT_MODEL_DATAMAP ) {
		parent::__construct( $modelId, [ ARK_CONTENT_MODEL_DATAMAP ] );
	}

	/**
	 * @return string
	 */
	protected function getContentClass() {
		return DataMapContent::class;
	}

	/**
	 * Only allow this content handler to be used in the configured Data namespace
	 * @param Title $title
	 * @return bool
	 */
	public function canBeUsedOn( Title $title ) {
		global $wgArkDataNamespace;
		if ( $title->getNamespace() !== $wgArkDataNamespace ) {
			return false;
		}

		return parent::canBeUsedOn( $title );
	}
}
