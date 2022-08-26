<?php
namespace MediaWiki\Extension\Ark\DataMaps\Content;

use JsonContentHandler;
use Title;
use stdclass;
use MediaWiki\Extension\Ark\DataMaps\DataMapsConfig;
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

	public function makeEmptyContent() {
		$datamap = new stdclass();
		$datamap->title = wfMessage( 'datamap-unnamed-map' );
		$datamap->crs = DataMapSpec::DEFAULT_COORDINATE_SPACE;
		$datamap->image = 'Map background.jpg';
		$datamap->groups = new stdclass();
		$datamap->markers = [];

		$group = new stdclass();
		$group->name = wfMessage( 'datamap-defaultloadout-group-name' );
		$group->fillColor = '#3246a8';
		$group->size = 12;
		$group->icon = 'Marker group icon in legend.png';
		$datamap->groups->group = $group;

		$marker = new stdclass();
		$marker->lat = 50;
		$marker->lon = 50;
		$datamap->markers['group'] = [ $marker ];

		$class = $this->getContentClass();
		return new $class( DataMapContent::toJSON( $datamap ) );
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
