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
        if ( $isSingle ) {
            $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        } else {
            $this->requireField( $status, 'name', DataModel::TYPE_STRING );
        }
        $this->requireField( $status, 'image', DataModel::TYPE_STRING );
        $this->expectField( $status, 'at', DataModel::TYPE_BOUNDS );
        $this->expectField( $status, 'overlays', DataModel::TYPE_ARRAY );
        $this->expectField( $status, 'associatedLayer', DataModel::TYPE_STRING );
        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            $this->requireFile( $status, $this->getImageName() );
        }
    }
}