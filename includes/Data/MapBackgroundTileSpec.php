<?php
namespace MediaWiki\Extension\DataMaps\Data;

use Status;

class MapBackgroundTileSpec extends DataModel {
    protected static string $publicName = 'MapBackgroundTileSpec';

    public function getImageName(): string {
        return $this->raw->image;
    }

    public function getPlacementLocation(): ?array {
        return isset( $this->raw->position ) ? $this->raw->position : null;
    }

    public function validate( Status $status, bool $isSingle = true ) {
        $this->checkField( $status, [
            'name' => 'position',
            'type' => DataModel::TYPE_DIMENSIONS,
            'required' => true
        ] );
        $this->checkField( $status, [
            'name' => 'image',
            'type' => DataModel::TYPE_FILE,
            'fileMustExist' => true,
            'required' => true
        ] );
        $this->disallowOtherFields( $status );
    }
}
