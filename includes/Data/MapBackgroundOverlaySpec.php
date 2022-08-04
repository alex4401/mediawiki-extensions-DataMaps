<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;

class MapBackgroundOverlaySpec extends DataModel {
    protected static string $publicName = 'MapBackgroundOverlaySpec';

    public function getName(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    public function getImageName(): ?string {
        return $this->raw->image;
    }

    public function getPlacementLocation(): array {
        return $this->raw->at;
    }

    public function getPath(): ?array {
        return $this->raw->path;
    }

    public function validate( Status $status ) {
        $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        $hasImage = $this->expectField( $status, 'image', DataModel::TYPE_STRING );
        $hasPath = $this->expectField( $status, 'path', DataModel::TYPE_ARRAY );
        if ( !isset( $this->raw->path ) ) {
            $this->requireField( $status, 'at', DataModel::TYPE_BOUNDS );
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