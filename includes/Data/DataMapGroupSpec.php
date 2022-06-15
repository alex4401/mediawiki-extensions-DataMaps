<?php
namespace Ark\DataMaps\Data;

class DataMapGroupSpec {
    const DEFAULT_CIRCLE_SIZE = 4;
    const DEFAULT_ICON_SIZE = [ 32, 32 ];

    // Display modes
    const DM_CIRCLE = 1;
    const DM_ICON = 2;
    const DM_UNKNOWN = -1;

    private string $id;
    private object $raw;

    public function __construct( string $id, object $raw ) {
        $this->id = $id;
        $this->raw = $raw;
    }

    public function getId(): string {
        return $this->id;
    }

    public function getName(): string {
        return $this->raw->name ?? wfMessage( 'datamap-unnamed-marker' );
    }

    public function getCircleSize(): int {
        assert( $this->getDisplayMode() == self::DM_CIRCLE );
        return $this->raw->size ?? self::DEFAULT_CIRCLE_SIZE;
    }

    public function getIconSize(): array {
        assert( $this->getDisplayMode() == self::DM_ICON );
        return $this->raw->size ?? self::DEFAULT_ICON_SIZE;
    }

    public function getSize() {
        switch ( $this->getDisplayMode() ) {
            case self::DM_CIRCLE:
                return $this->getCircleSize();
            case self::DM_ICON:
                return $this->getIconSize();
            default:
                return null;
        }
    }

    public function getFillColour(): ?string {
        // TODO: validate if this is actually a colour (RGB (consider arrays?) or HEX)
        return isset( $this->raw->fillColor ) ? $this->raw->fillColor : null;
    }

    private function getUniversalIcon(): ?string {
        return isset( $this->raw->icon ) ? $this->raw->icon : null;
    }

    public function getMarkerIcon(): ?string {
        return isset( $this->raw->markerIcon ) ? $this->raw->markerIcon : $this->getUniversalIcon();
    }

    public function getLegendIcon(): ?string {
        return isset( $this->raw->legendIcon ) ? $this->raw->legendIcon : $this->getUniversalIcon();
    }

    public function getDisplayMode(): int {
        if ( $this->getFillColour() !== null ) {
            return self::DM_CIRCLE;
        } else if ( $this->getMarkerIcon() !== null ) {
            return self::DM_ICON;
        }
        return self::DM_UNKNOWN;
    }

    public function getSharedRelatedArticle(): ?string {
        return isset( $this->raw->relatedArticle ) ? $this->raw->relatedArticle : null;
    }

    public function validate(): ?string {
        if ( $this->getMarkerIcon() === null && $this->getFillColour() === null ) {
            return wfMessage( 'datamap-error-validation-no-display', wfEscapeWikiText( $this->id ) )->escaped();
        }

        if ( $this->getMarkerIcon() !== null && $this->getFillColour() !== null ) {
            return wfMessage( 'datamap-error-validation-ambiguous-display', wfEscapeWikiText( $this->id ) )->escaped();
        }

        return null;
    }
}