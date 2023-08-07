<?php
namespace MediaWiki\Extension\DataMaps\Data;

use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;

// TODO: this is kind of a mess, needs a rewrite

class MapBackgroundOverlaySpec extends DataModel {
    protected static string $publicName = 'MapBackgroundOverlaySpec';

    public const TYPE_RECT = 1;
    public const TYPE_POLYLINE = 2;
    public const TYPE_IMAGE = 3;

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getType(): int {
        if ( $this->getImageName() != null ) {
            return self::TYPE_IMAGE;
        } elseif ( $this->getPath() != null ) {
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

    public function wantsImageGapWorkaround(): bool {
        return $this->raw->reduceGaps ?? false;
    }

    public function isImagePixelated(): bool {
        return $this->raw->pixelated ?? false;
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
        $this->checkField( $status, 'name', DataModel::TYPE_STRING );
        $hasImage = $this->checkField( $status, [
            'name' => 'image',
            'type' => DataModel::TYPE_FILE,
            'fileMustExist' => true
        ] );
        // if ( isset( $this->raw->image ) ) {
        //     $this->checkField( $status, 'renderLikeTiles', DataModel::TYPE_BOOL );
        // }
        $hasPath = $this->checkField( $status, [
            'name' => 'path',
            'type' => DataModel::TYPE_ARRAY,
            'itemCheck' => function ( Status $status, $item ) {
                if ( !$this->verifyType( $item, DataModel::TYPE_VECTOR2 ) ) {
                    $status->fatal( 'datamap-error-validatespec-bgoverlay-invalid-polyline' );
                    return false;
                }
                return true;
            }
        ] );
        // Placement location, only allowed if not a polyline
        if ( !isset( $this->raw->path ) ) {
            $this->checkField( $status, 'at', DataModel::TYPE_BOUNDS );
        }

        if ( isset( $this->raw->image ) ) {
            $this->checkField( $status, 'pixelated', DataModel::TYPE_BOOL );
            $this->checkField( $status, 'reduceGaps', DataModel::TYPE_BOOL );
        }

        if ( $this->supportsDrawProperties() ) {
            $this->checkField( $status, 'color', DataModel::TYPE_COLOUR4 );
            switch ( $this->getType() ) {
                case self::TYPE_POLYLINE:
                    $this->checkField( $status, 'thickness', DataModel::TYPE_NUMBER );
                    // TODO: allow border thickness on rectangles
                case self::TYPE_RECT:
                    $this->checkField( $status, 'borderColor', DataModel::TYPE_COLOUR3 );
                    break;
            }
        }

        $this->disallowOtherFields( $status );
    }
}
