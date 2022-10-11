<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

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

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getBackgroundLayerName(): ?string {
        return isset( $this->raw->associatedLayer ) ? $this->raw->associatedLayer : null;
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
        $this->checkField( $status, [
            'name' => 'image',
            'type' => DataModel::TYPE_FILE,
            'required' => true,
            'fileMustExist' => true
        ] );
        $this->checkField( $status, 'at', DataModel::TYPE_BOUNDS );
        $this->checkField( $status, [
            'name' => 'overlays',
            'type' => DataModel::TYPE_ARRAY,
            'itemCheck' => function ( Status $status, $item ) {
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