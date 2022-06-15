<?php
namespace Ark\DataMaps\Data;

class DataMapBackgroundOverlaySpec {
    private object $raw;

    public function __construct( object $raw ) {
        $this->raw = $raw;
    }

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getPlacementLocation(): array {
        return $this->raw->at;
    }

    public function validate(): ?string {
        // TODO: implement
        return null;
    }
}