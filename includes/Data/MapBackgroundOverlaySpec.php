<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;

class MapBackgroundOverlaySpec extends DataModel {
    protected static string $publicName = 'MapBackgroundOverlaySpec';

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getImageName(): string {
        return $this->raw->image;
    }

    public function getPlacementLocation(): array {
        return $this->raw->at;
    }

    public function validate( Status $status ) {
        $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        $this->expectField( $status, 'image', DataModel::TYPE_STRING );
        $this->requireField( $status, 'at', DataModel::TYPE_BOUNDS );

        if ( isset( $this->raw->image ) ) {
            $this->requireFile( $status, $this->getImageName() );
        }
    }
}