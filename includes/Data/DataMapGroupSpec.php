<?php
namespace Ark\DataMaps\Data;

use Ark\DataMaps\Rendering\Utils\DataMapColourUtils;

class DataMapGroupSpec {
    const DEFAULT_CIRCLE_SIZE = 5;
    const DEFAULT_CIRCLE_STROKE_WIDTH = 1;
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
        return isset( $this->raw->size ) ? $this->raw->size : self::DEFAULT_CIRCLE_SIZE;
    }

    public function getIconSize(): array {
        assert( $this->getDisplayMode() == self::DM_ICON );
        return isset( $this->raw->size ) ? $this->raw->size : self::DEFAULT_ICON_SIZE;
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

    public function getExtraMinZoomSize() {
        // TODO: only supported for circle markers
        return isset( $this->raw->extraMinZoomSize ) ? $this->raw->extraMinZoomSize : null;
    }

    public function getRawFillColour() /*: ?array|string*/ {
        // TODO: validate if this is actually a colour (RGB (consider arrays?) or HEX)
        return isset( $this->raw->fillColor ) ? $this->raw->fillColor : null;
    }

    public function getRawStrokeColour() /*: ?array|string*/ {
        // TODO: validate if this is actually a colour (RGB (consider arrays?) or HEX)
        return isset( $this->raw->borderColor ) ? $this->raw->borderColor : null;
    }

    public function getFillColour(): array {
        // TODO: validate if this is actually a colour (RGB (consider arrays?) or HEX)
        return DataMapColourUtils::decode( $this->getRawFillColour() );
    }

    public function getStrokeColour(): array {
        // TODO: validate if this is actually a colour (RGB (consider arrays?) or HEX)
        if ( $this->getRawStrokeColour() != null ) {
            return DataMapColourUtils::decode( $this->getRawStrokeColour() );
        }

        return $this->getFillColour();
    }

    public function getStrokeWidth() /*: ?int|float */ {
        return isset( $this->raw->borderWidth ) ? $this->raw->borderWidth : self::DEFAULT_CIRCLE_STROKE_WIDTH;
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
        if ( $this->getRawFillColour() !== null ) {
            return self::DM_CIRCLE;
        } else if ( $this->getMarkerIcon() !== null ) {
            return self::DM_ICON;
        }
        return self::DM_UNKNOWN;
    }

    public function getSharedRelatedArticle(): ?string {
        return isset( $this->raw->article ) ? $this->raw->article : (
            // DEPRECATED(v0.7.0:v0.9.0): switch to `article`, more intuitive
            isset( $this->raw->relatedArticle ) ? $this->raw->relatedArticle : null
        );
    }

    public function canDismiss(): bool {
        return isset( $this->raw->canDismiss ) ? $this->raw->canDismiss : false;
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