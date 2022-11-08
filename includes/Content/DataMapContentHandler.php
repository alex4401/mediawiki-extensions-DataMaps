<?php
namespace MediaWiki\Extension\Ark\DataMaps\Content;

use JsonContentHandler;
use Title;
use stdclass;
use MediaWiki\Extension\Ark\DataMaps\ExtensionConfig;
use MediaWiki\Extension\Ark\DataMaps\Content\DataMapContent;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;

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
		if ( $title->getNamespace() !== ExtensionConfig::getNamespaceId() ) {
			return false;
		}

		return parent::canBeUsedOn( $title );
	}
}
