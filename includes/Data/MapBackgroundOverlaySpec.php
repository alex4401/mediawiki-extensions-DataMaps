<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;

// TODO: this is kind of a mess, needs a rewrite

class MapBackgroundOverlaySpec extends DataModel {
    protected static string $publicName = 'MapBackgroundOverlaySpec';

    const TYPE_RECT = 1;
    const TYPE_POLYLINE = 2;
    const TYPE_IMAGE = 3;

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getType(): int {
        if ( $this->getImageName() != null ) {
            return self::TYPE_IMAGE;
        } else if ( $this->getPath() != null ) {
            return self::TYPE_POLYLINE;
        }
        return self::TYPE_RECT;
    }

    public function getImageName(): ?string {
        return isset( $this->raw->image ) ? $this->raw->image : null;
    }

    public function getPlacementLocation(): array {
        return $this->raw->at;
    }

    public function getPath(): ?array {
        return isset( $this->raw->path ) ? $this->raw->path : null;
    }

    public function supportsDrawProperties(): bool {
        return $this->getType() != self::TYPE_IMAGE;
    }

    public function getRawFillColour() /*: ?array|string*/ {
        return isset( $this->raw->color ) ? $this->raw->color : null;
    }

    public function getFillColour(): ?array {
        return DataMapColourUtils::decode4( $this->getRawFillColour() );
    }

    public function getPolylineThickness(): ?float {
        return isset( $this->raw->thickness ) ? $this->raw->thickness : null;
    }

    public function getRawRectStrokeColour() /*: ?array|string*/ {
        return isset( $this->raw->borderColor ) ? $this->raw->borderColor : null;
    }

    public function getRectStrokeColour(): ?array {
        return DataMapColourUtils::decode( $this->getRawRectStrokeColour() );
    }

    public function validate( Status $status ) {
        $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        $hasImage = $this->expectField( $status, 'image', DataModel::TYPE_STRING );
        $hasPath = $this->expectField( $status, 'path', DataModel::TYPE_ARRAY );
        // Placement location, only allowed if not a polyline
        if ( !isset( $this->raw->path ) ) {
            $this->requireField( $status, 'at', DataModel::TYPE_BOUNDS );
        }

        if ( $this->supportsDrawProperties() ) {
            $this->expectField( $status, 'color', DataModel::TYPE_COLOUR4 );
            switch ( $this->getType() ) {
                case self::TYPE_POLYLINE:
                    $this->expectField( $status, 'thickness', DataModel::TYPE_NUMBER );
                    break;
                case self::TYPE_RECT:
                    $this->expectField( $status, 'borderColor', DataModel::TYPE_COLOUR3 );
                    break;
            }
        }

        $this->disallowOtherFields( $status );

        if ( $hasPath ) {
            foreach ( $this->getPath() as &$v2d ) {
                if ( !$this->verifyType( $v2d, DataModel::TYPE_VECTOR2 ) ) {
                    $status->fatal( 'datamap-error-validatespec-bgoverlay-invalid-polyline' );
                }
            }
        }

        if ( $hasImage ) {
            $this->requireFile( $status, $this->getImageName() );
        }
    }
}