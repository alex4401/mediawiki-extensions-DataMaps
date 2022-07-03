<?php
namespace Ark\DataMaps\Data;

use Status;

class DataMapBackgroundOverlaySpec extends DataModel {
    protected static string $publicName = 'MapBackgroundOverlaySpec';

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getPlacementLocation(): array {
        return $this->raw->at;
    }

    public function validate( Status $status ) {
        $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        $this->requireField( $status, 'at', DataModel::TYPE_BOUNDS );
    }
}