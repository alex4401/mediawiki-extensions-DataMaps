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
        return isset( $this->raw->label ) ? $this->raw->label : null;
    }

    public function getDescription(): ?string {
        return isset( $this->raw->description ) ? $this->raw->description : null;
    }

    public function isDescriptionWikitext(): bool {
        return $this->raw->isDescriptionWikitext ?? false;
    }

    public function getPopupImage(): ?string {
        return isset( $this->raw->popupImage ) ? $this->raw->popupImage : null;
    }

    public function getRelatedArticle(): ?string {
        return isset( $this->raw->relatedArticle ) ? $this->raw->relatedArticle : null;
    }

    public function validate(): ?string {
        // TODO: implement
        return null;
    }
}