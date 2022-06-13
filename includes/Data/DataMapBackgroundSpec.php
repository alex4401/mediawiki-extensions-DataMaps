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
        return $this->raw->at;
    }

    public function getName(): ?string {
        // TODO: validate, this is required if there's more than 1 background
        return $this->raw->name;
    }

    public function validate(): ?string {
        // TODO: implement
        return null;
    }
}