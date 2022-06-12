<?php
namespace Ark\DataMaps\Data;

class DataMapMarkerSpec {
    private object $raw;

    public function __construct( object $raw ) {
        $this->raw = $raw;
    }

    public function reassignTo( object $newRaw ) {
        $this->raw = $newRaw;
    }

    public function getLatitude(): float {
        return $this->raw->lat;
    }

    public function getLongitude(): float {
        return $this->raw->long;
    }

    public function getLabel(): ?string {
        return $this->raw->label;
    }

    public function getDescription(): ?string {
        return $this->raw->description;
    }

    public function validate(): ?string {
        // TODO: implement
        return null;
    }
}