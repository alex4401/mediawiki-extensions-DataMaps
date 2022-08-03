<?php
namespace MediaWiki\Extension\Ark\DataMaps\Content;

use JsonContentHandler;
use Title;
use MediaWiki\Extension\Ark\DataMaps\DataMapsConfig;

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
		if ( $title->getNamespace() !== DataMapsConfig::getNamespace() ) {
			return false;
		}

		return parent::canBeUsedOn( $title );
	}
}
