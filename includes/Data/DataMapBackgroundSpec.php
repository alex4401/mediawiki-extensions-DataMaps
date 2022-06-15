<?php
namespace Ark\DataMaps\Data;

class DataMapBackgroundSpec {
    private object $raw;

    public function __construct( object $raw ) {
        $this->raw = $raw;
    }

    public function getImageName(): string {
        return $this->raw->image;
    }

    public function getPlacementLocation(): ?array {
        return isset( $this->raw->at ) ? $this->raw->at : null;
    }

    public function getName(): ?string {
        // TODO: validate, this is required if there's more than 1 background
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function hasOverlays(): bool {
        return isset( $this->raw->overlays );
    }

    public function iterateOverlays( callable $callback ) {
        foreach ( $this->raw->overlays as &$raw ) {
            $callback( new DataMapBackgroundOverlaySpec( $raw ) );
        }
    }

    public function validate(): ?string {
        // TODO: implement
        return null;
    }
}