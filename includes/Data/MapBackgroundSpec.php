<?php
namespace MediaWiki\Extension\DataMaps\Data;

use Status;

class MapBackgroundSpec extends DataModel {
    protected static string $publicName = 'MapBackgroundSpec';

    public static function fromImageName( string $file ) {
        $fake = new \stdClass();
        $fake->image = $file;
        return new MapBackgroundSpec( $fake );
    }

    public function getImageName(): string {
        return $this->raw->image;
    }

    public function getPlacementLocation(): ?array {
        return isset( $this->raw->at ) ? $this->raw->at : null;
    }

    public function getTilePlacementOffset(): ?array {
        return isset( $this->raw->at ) ? $this->raw->at : null;
    }

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function isPixelated(): bool {
        return $this->raw->pixelated ?? false;
    }

    public function getBackgroundLayerName(): ?string {
        return isset( $this->raw->associatedLayer ) ? $this->raw->associatedLayer : null;
    }

    public function hasTiles(): bool {
        return isset( $this->raw->tiles );
    }

    public function getTileSize(): array {
        return $this->raw->tileSize;
    }

    public function iterateTiles( callable $callback ) {
        foreach ( $this->raw->tiles as &$raw ) {
            $callback( new MapBackgroundTileSpec( $raw ) );
        }
    }

    public function hasOverlays(): bool {
        return isset( $this->raw->overlays );
    }

    public function iterateOverlays( callable $callback ) {
        foreach ( $this->raw->overlays as &$raw ) {
            $callback( new MapBackgroundOverlaySpec( $raw ) );
        }
    }

    public function validate( Status $status, bool $isSingle = true ) {
        $this->checkField( $status, [
            'name' => 'name',
            'type' => DataModel::TYPE_STRING,
            'required' => !$isSingle
        ] );

        if ( !$this->conflict( $status, [ 'image', 'tiles' ] ) ) {
            if ( isset( $this->raw->image ) ) {
                $this->checkField( $status, [
                    'name' => 'image',
                    'type' => DataModel::TYPE_FILE,
                    'fileMustExist' => true
                ] );
                $this->checkField( $status, 'at', DataModel::TYPE_BOUNDS );
            } elseif ( isset( $this->raw->tiles ) ) {
                $this->checkField( $status, 'at', DataModel::TYPE_VECTOR2 );
                $this->checkField( $status, [
                    'name' => 'tileSize',
                    'type' => DataModel::TYPE_DIMENSIONS,
                    'required' => true
                ] );
                $this->checkField( $status, [
                    'name' => 'tiles',
                    'type' => DataModel::TYPE_ARRAY,
                    'itemType' => DataModel::TYPE_OBJECT,
                    'itemCheck' => static function ( $status, $item ) {
                        $spec = new MapBackgroundTileSpec( $item );
                        if ( !$spec->validate( $status ) ) {
                            return false;
                        }
                        return true;
                    }
                ] );
            } else {
                $status->fatal( 'datamap-error-validate-field-required-either', self::$publicName, 'image', 'tiles' );
                $this->validationAreRequiredFieldsPresent = false;
            }
        }

        $this->checkField( $status, 'pixelated', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'overlays',
            'type' => DataModel::TYPE_ARRAY,
            'itemType' => DataModel::TYPE_OBJECT,
            'itemCheck' => static function ( Status $status, $item ) {
                $spec = new MapBackgroundOverlaySpec( $item );
                if ( !$spec->validate( $status ) ) {
                    return false;
                }
                return true;
            }
        ] );
        $this->checkField( $status, 'associatedLayer', DataModel::TYPE_STRING );
        $this->disallowOtherFields( $status );
    }
}
